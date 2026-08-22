PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  theme TEXT NOT NULL,
  motion_intensity TEXT NOT NULL,
  target_retention REAL NOT NULL CHECK(target_retention BETWEEN 0.70 AND 0.97),
  network_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(network_opt_in IN (0,1)),
  telemetry_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(telemetry_opt_in IN (0,1)),
  settings_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  exam_date_utc TEXT,
  selected INTEGER NOT NULL CHECK(selected IN (0,1))
);

CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  official_status TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  license TEXT NOT NULL,
  attribution TEXT,
  coverage TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pack_versions (
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  checksum TEXT NOT NULL,
  installed_at_utc TEXT NOT NULL,
  PRIMARY KEY(pack_id, version)
);

CREATE TABLE IF NOT EXISTS lexemes (
  id TEXT PRIMARY KEY,
  lemma TEXT NOT NULL,
  language TEXT NOT NULL,
  normalized_lemma TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_senses (
  id TEXT PRIMARY KEY,
  identity_key TEXT NOT NULL UNIQUE,
  lexeme_id TEXT NOT NULL REFERENCES lexemes(id) ON DELETE RESTRICT,
  part_of_speech TEXT NOT NULL,
  sense_key TEXT NOT NULL,
  definition_zh TEXT NOT NULL,
  definition_en TEXT NOT NULL,
  content_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alias_maps (
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  old_sense_id TEXT NOT NULL,
  new_sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE RESTRICT,
  PRIMARY KEY(pack_id, old_sense_id)
);

CREATE TABLE IF NOT EXISTS pack_memberships (
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE RESTRICT,
  pack_version TEXT NOT NULL,
  PRIMARY KEY(pack_id, sense_id)
);

CREATE TABLE IF NOT EXISTS pronunciations (
  id TEXT PRIMARY KEY,
  lexeme_id TEXT NOT NULL REFERENCES lexemes(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  ipa TEXT,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS example_sentences (
  id TEXT PRIMARY KEY,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  translation TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collocations (
  id TEXT PRIMARY KEY,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  source_sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  target_sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  CHECK(source_sense_id <> target_sense_id)
);

CREATE TABLE IF NOT EXISTS mnemonic_cues (
  id TEXT PRIMARY KEY,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  cue_type TEXT NOT NULL,
  text TEXT NOT NULL,
  verified INTEGER NOT NULL CHECK(verified IN (0,1)),
  provenance TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cue_effectiveness (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  cue_type TEXT NOT NULL,
  successes INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  confusing_votes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, sense_id, cue_type)
);

CREATE TABLE IF NOT EXISTS motion_recipes (
  sense_id TEXT PRIMARY KEY REFERENCES word_senses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  intensity TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  iteration_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visual_assets (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  author TEXT NOT NULL,
  license TEXT NOT NULL,
  purpose TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL,
  due_at_utc TEXT NOT NULL,
  last_reviewed_at_utc TEXT,
  fsrs_stability REAL,
  fsrs_difficulty REAL,
  desired_retention REAL NOT NULL,
  suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
  UNIQUE(user_id, sense_id, direction)
);

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
  reviewed_at_utc TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 4),
  response_ms INTEGER NOT NULL,
  confused_with_sense_id TEXT REFERENCES word_senses(id) ON DELETE SET NULL,
  cue_type TEXT,
  fsrs_before_json TEXT NOT NULL,
  fsrs_after_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS directional_mastery (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  stage TEXT NOT NULL,
  success_streak INTEGER NOT NULL,
  lapse_streak INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY(user_id, sense_id, direction)
);

CREATE TABLE IF NOT EXISTS scaffold_states (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  summary_stage TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  PRIMARY KEY(user_id, sense_id)
);

CREATE TABLE IF NOT EXISTS confusion_edges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  target_sense_id TEXT NOT NULL REFERENCES word_senses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  weight REAL NOT NULL CHECK(weight >= 0 AND weight <= 10),
  count INTEGER NOT NULL CHECK(count >= 0),
  last_seen_at_utc TEXT NOT NULL,
  history_json TEXT NOT NULL,
  PRIMARY KEY(user_id, source_sense_id, target_sense_id, kind),
  CHECK(source_sense_id <> target_sense_id)
);

CREATE TABLE IF NOT EXISTS source_contexts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sense_id TEXT REFERENCES word_senses(id) ON DELETE SET NULL,
  captured_at_utc TEXT NOT NULL,
  redacted_context TEXT NOT NULL,
  trigger TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attention_budgets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_day_key TEXT NOT NULL,
  appearances INTEGER NOT NULL,
  new_count INTEGER NOT NULL,
  review_count INTEGER NOT NULL,
  last_shown_at_utc TEXT,
  paused_until_utc TEXT,
  PRIMARY KEY(user_id, local_day_key)
);

CREATE TABLE IF NOT EXISTS snooze_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES review_cards(id) ON DELETE SET NULL,
  created_at_utc TEXT NOT NULL,
  until_utc TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS window_positions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_key TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  updated_at_utc TEXT NOT NULL,
  PRIMARY KEY(user_id, display_key)
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_license TEXT NOT NULL,
  status TEXT NOT NULL,
  dry_run INTEGER NOT NULL CHECK(dry_run IN (0,1)),
  report_json TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pack_conflicts (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  identity_key TEXT NOT NULL,
  code TEXT NOT NULL,
  detail TEXT NOT NULL,
  resolved_at_utc TEXT
);

CREATE INDEX IF NOT EXISTS idx_word_senses_lexeme ON word_senses(lexeme_id);
CREATE INDEX IF NOT EXISTS idx_memberships_sense ON pack_memberships(sense_id);
CREATE INDEX IF NOT EXISTS idx_review_cards_due ON review_cards(user_id, suspended, due_at_utc);
CREATE INDEX IF NOT EXISTS idx_review_events_card_time ON review_events(card_id, reviewed_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_confusion_weight ON confusion_edges(user_id, weight DESC);
CREATE INDEX IF NOT EXISTS idx_examples_sense ON example_sentences(sense_id);
CREATE INDEX IF NOT EXISTS idx_source_context_user_time ON source_contexts(user_id, captured_at_utc DESC);

PRAGMA user_version = 1;
