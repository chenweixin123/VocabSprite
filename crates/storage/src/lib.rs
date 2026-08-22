use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::Path;

const MIGRATION_1: &str = include_str!("../migrations/0001_init.sql");

pub struct Database {
    connection: Connection,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SenseImport {
    pub id: String,
    pub identity_key: String,
    pub lexeme_id: String,
    pub lemma: String,
    pub part_of_speech: String,
    pub sense_key: String,
    pub definition_zh: String,
    pub definition_en: String,
    pub content_json: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCommit {
    pub event_id: String,
    pub card_id: String,
    pub reviewed_at_utc: DateTime<Utc>,
    pub rating: u8,
    pub response_ms: u32,
    pub fsrs_before_json: String,
    pub fsrs_after_json: String,
    pub due_at_utc: DateTime<Utc>,
    pub stability: f32,
    pub difficulty: f32,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let connection = Connection::open(path).with_context(|| {
            format!("failed to open VocabSprite database at {}", path.display())
        })?;
        let mut database = Self { connection };
        database.migrate()?;
        Ok(database)
    }

    pub fn open_in_memory() -> Result<Self> {
        let connection =
            Connection::open_in_memory().context("failed to open in-memory database")?;
        let mut database = Self { connection };
        database.migrate()?;
        Ok(database)
    }

    pub fn migrate(&mut self) -> Result<()> {
        self.connection
            .execute_batch(MIGRATION_1)
            .context("failed to apply SQLite migration 1")?;
        self.connection.execute(
            "INSERT OR IGNORE INTO schema_migrations(version, applied_at_utc) VALUES(1, ?1)",
            [Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn schema_version(&self) -> Result<u32> {
        self.connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .context("failed to read schema version")
    }

    pub fn ensure_default_user(&self) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.connection.execute(
            "INSERT OR IGNORE INTO users(id, created_at_utc) VALUES('local-user', ?1)",
            [now],
        )?;
        Ok(())
    }

    pub fn load_app_state(&self, user_id: &str) -> Result<Option<String>> {
        self.connection
            .query_row(
                "SELECT settings_json FROM user_settings WHERE user_id=?1",
                [user_id],
                |row| row.get(0),
            )
            .optional()
            .context("failed to load local application state")
    }

    pub fn save_app_state(&self, user_id: &str, state_json: &str) -> Result<()> {
        serde_json::from_str::<Value>(state_json).context("application state is not valid JSON")?;
        self.ensure_default_user()?;
        self.connection.execute(
            "INSERT INTO user_settings(user_id,locale,theme,motion_intensity,target_retention,network_opt_in,telemetry_opt_in,settings_json)
             VALUES(?1,'zh-CN','system','low',0.9,0,0,?2)
             ON CONFLICT(user_id) DO UPDATE SET settings_json=excluded.settings_json",
            params![user_id, state_json],
        )?;
        Ok(())
    }

    pub fn record_snooze(&self, user_id: &str, until_utc: &str, reason: &str) -> Result<()> {
        DateTime::parse_from_rfc3339(until_utc).context("snooze deadline is not RFC 3339")?;
        self.ensure_default_user()?;
        self.connection.execute(
            "INSERT INTO snooze_events(id,user_id,card_id,created_at_utc,until_utc,reason)
             VALUES(?1,?2,NULL,?3,?4,?5)",
            params![
                uuid_like_id("snooze"),
                user_id,
                Utc::now().to_rfc3339(),
                until_utc,
                reason
            ],
        )?;
        Ok(())
    }

    pub fn save_window_position(
        &self,
        user_id: &str,
        display_key: &str,
        x: i32,
        y: i32,
    ) -> Result<()> {
        self.ensure_default_user()?;
        self.connection.execute(
            "INSERT INTO window_positions(user_id,display_key,x,y,updated_at_utc) VALUES(?1,?2,?3,?4,?5)
             ON CONFLICT(user_id,display_key) DO UPDATE SET x=excluded.x,y=excluded.y,updated_at_utc=excluded.updated_at_utc",
            params![user_id, display_key, x, y, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn import_pack_senses(
        &mut self,
        pack_id: &str,
        title: &str,
        stage: &str,
        version: &str,
        checksum: &str,
        senses: &[SenseImport],
    ) -> Result<()> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO packs(id,title,stage,official_status,source_name,source_url,license,attribution,coverage)
             VALUES(?1,?2,?3,'community-compatible','VocabSprite original demo content',NULL,'CC0-1.0',NULL,'demo')
             ON CONFLICT(id) DO UPDATE SET title=excluded.title, stage=excluded.stage",
            params![pack_id, title, stage],
        )?;
        transaction.execute(
            "INSERT OR REPLACE INTO pack_versions(pack_id,version,checksum,installed_at_utc) VALUES(?1,?2,?3,?4)",
            params![pack_id, version, checksum, Utc::now().to_rfc3339()],
        )?;
        for sense in senses {
            transaction.execute(
                "INSERT INTO lexemes(id,lemma,language,normalized_lemma) VALUES(?1,?2,'en',lower(?2))
                 ON CONFLICT(id) DO NOTHING",
                params![sense.lexeme_id, sense.lemma],
            )?;
            transaction.execute(
                "INSERT INTO word_senses(id,identity_key,lexeme_id,part_of_speech,sense_key,definition_zh,definition_en,content_json)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8)
                 ON CONFLICT(identity_key) DO UPDATE SET content_json=excluded.content_json",
                params![sense.id, sense.identity_key, sense.lexeme_id, sense.part_of_speech, sense.sense_key,
                        sense.definition_zh, sense.definition_en, sense.content_json],
            )?;
            let canonical_id: String = transaction.query_row(
                "SELECT id FROM word_senses WHERE identity_key=?1",
                [&sense.identity_key],
                |row| row.get(0),
            )?;
            transaction.execute(
                "INSERT OR REPLACE INTO pack_memberships(pack_id,sense_id,pack_version) VALUES(?1,?2,?3)",
                params![pack_id, canonical_id, version],
            )?;
        }
        transaction
            .commit()
            .context("failed to commit atomic pack import")
    }

    pub fn commit_review(&mut self, review: &ReviewCommit) -> Result<()> {
        if !(1..=4).contains(&review.rating) {
            anyhow::bail!("review rating must be between 1 and 4");
        }
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO review_events(id,card_id,reviewed_at_utc,rating,response_ms,confused_with_sense_id,cue_type,fsrs_before_json,fsrs_after_json)
             VALUES(?1,?2,?3,?4,?5,NULL,NULL,?6,?7)",
            params![review.event_id, review.card_id, review.reviewed_at_utc.to_rfc3339(), review.rating,
                    review.response_ms, review.fsrs_before_json, review.fsrs_after_json],
        )?;
        transaction.execute(
            "UPDATE review_cards SET due_at_utc=?1,last_reviewed_at_utc=?2,fsrs_stability=?3,fsrs_difficulty=?4 WHERE id=?5",
            params![review.due_at_utc.to_rfc3339(), review.reviewed_at_utc.to_rfc3339(),
                    review.stability, review.difficulty, review.card_id],
        )?;
        transaction
            .commit()
            .context("failed to atomically commit review")
    }

    pub fn delete_all_user_data(&mut self, user_id: &str) -> Result<()> {
        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM users WHERE id=?1", [user_id])?;
        transaction.commit().context("failed to delete user data")
    }

    pub fn export_user_backup(&self, user_id: &str) -> Result<Value> {
        let user: Option<String> = self
            .connection
            .query_row(
                "SELECT created_at_utc FROM users WHERE id=?1",
                [user_id],
                |row| row.get(0),
            )
            .optional()?;
        let review_count: i64 = self.connection.query_row(
            "SELECT count(*) FROM review_events e JOIN review_cards c ON c.id=e.card_id WHERE c.user_id=?1",
            [user_id],
            |row| row.get(0),
        )?;
        let confusion_count: i64 = self.connection.query_row(
            "SELECT count(*) FROM confusion_edges WHERE user_id=?1",
            [user_id],
            |row| row.get(0),
        )?;
        Ok(json!({
            "schemaVersion": 1,
            "exportedAtUtc": Utc::now().to_rfc3339(),
            "userCreatedAtUtc": user,
            "reviewCount": review_count,
            "confusionEdgeCount": confusion_count
        }))
    }

    pub fn count(&self, table: &str) -> Result<i64> {
        const ALLOWED: &[&str] = &[
            "users",
            "packs",
            "word_senses",
            "pack_memberships",
            "review_cards",
            "review_events",
            "confusion_edges",
            "snooze_events",
            "window_positions",
            "schema_migrations",
        ];
        if !ALLOWED.contains(&table) {
            anyhow::bail!("table is not allowed for count")
        }
        self.connection
            .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .context("failed to count table")
    }

    #[cfg(test)]
    fn connection(&self) -> &Connection {
        &self.connection
    }
}

fn uuid_like_id(prefix: &str) -> String {
    format!("{prefix}.{}", uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sense(id: &str, identity: &str) -> SenseImport {
        SenseImport {
            id: id.to_owned(),
            identity_key: identity.to_owned(),
            lexeme_id: format!("lexeme.{id}"),
            lemma: "adapt".to_owned(),
            part_of_speech: "verb".to_owned(),
            sense_key: "change-to-fit".to_owned(),
            definition_zh: "适应".to_owned(),
            definition_en: "change to fit".to_owned(),
            content_json: "{}".to_owned(),
        }
    }

    #[test]
    fn migration_is_idempotent_and_has_due_index() {
        let mut database = Database::open_in_memory().unwrap();
        database.migrate().unwrap();
        assert_eq!(database.schema_version().unwrap(), 1);
        assert_eq!(database.count("schema_migrations").unwrap(), 1);
        let index: String = database
            .connection()
            .query_row(
                "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_review_cards_due'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index, "idx_review_cards_due");
    }

    #[test]
    fn overlapping_pack_imports_share_a_sense() {
        let mut database = Database::open_in_memory().unwrap();
        let item = sense("sense.adapt", "adapt|verb|change-to-fit");
        database
            .import_pack_senses(
                "one",
                "One",
                "cet4",
                "0.1.0",
                "sha256:one",
                std::slice::from_ref(&item),
            )
            .unwrap();
        database
            .import_pack_senses("two", "Two", "cet6", "0.1.0", "sha256:two", &[item])
            .unwrap();
        assert_eq!(database.count("word_senses").unwrap(), 1);
        assert_eq!(database.count("pack_memberships").unwrap(), 2);
    }

    #[test]
    fn failed_import_rolls_back_every_row() {
        let mut database = Database::open_in_memory().unwrap();
        let bad = [
            sense("duplicate", "adapt|verb|change-to-fit"),
            sense("duplicate", "adopt|verb|begin-to-use"),
        ];
        assert!(database
            .import_pack_senses("bad", "Bad", "custom", "0.1.0", "sha256:bad", &bad)
            .is_err());
        assert_eq!(database.count("packs").unwrap(), 0);
        assert_eq!(database.count("word_senses").unwrap(), 0);
    }

    #[test]
    fn deleting_a_user_cascades_private_confusion_data_but_not_content() {
        let mut database = Database::open_in_memory().unwrap();
        let item = sense("sense.adapt", "adapt|verb|change-to-fit");
        let other = SenseImport {
            id: "sense.adopt".to_owned(),
            identity_key: "adopt|verb|begin-to-use".to_owned(),
            ..item.clone()
        };
        database
            .import_pack_senses("one", "One", "cet4", "0.1.0", "sha256:one", &[item, other])
            .unwrap();
        database.ensure_default_user().unwrap();
        database.connection().execute(
            "INSERT INTO confusion_edges(user_id,source_sense_id,target_sense_id,kind,weight,count,last_seen_at_utc,history_json)
             VALUES('local-user','sense.adapt','sense.adopt','user-error',2,1,'2026-01-01T00:00:00Z','[]')",
            [],
        ).unwrap();
        database.delete_all_user_data("local-user").unwrap();
        assert_eq!(database.count("confusion_edges").unwrap(), 0);
        assert_eq!(database.count("word_senses").unwrap(), 2);
    }
}
