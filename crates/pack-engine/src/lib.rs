use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Component, Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SenseRecord {
    pub id: String,
    pub identity_key: String,
    pub lemma: String,
    pub part_of_speech: String,
    pub sense_key: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackRecord {
    pub id: String,
    pub stage: String,
    pub version: String,
    pub license: String,
    pub source_name: String,
    pub senses: Vec<SenseRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FusedRecord {
    pub sense: SenseRecord,
    pub pack_ids: BTreeSet<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FusionConflict {
    pub identity_key: String,
    pub detail: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct FusionResult {
    pub senses: BTreeMap<String, FusedRecord>,
    pub conflicts: Vec<FusionConflict>,
}

pub fn fuse_packs(packs: &[PackRecord]) -> FusionResult {
    let mut result = FusionResult::default();
    let mut stable_ids = BTreeMap::<String, String>::new();
    for pack in packs {
        for sense in &pack.senses {
            if let Some(identity) = stable_ids.get(&sense.id) {
                if identity != &sense.identity_key {
                    result.conflicts.push(FusionConflict {
                        identity_key: sense.identity_key.clone(),
                        detail: format!("stable id {} already belongs to {identity}", sense.id),
                    });
                    continue;
                }
            }
            stable_ids.insert(sense.id.clone(), sense.identity_key.clone());
            match result.senses.get_mut(&sense.identity_key) {
                Some(existing) => {
                    if existing.sense.lemma != sense.lemma
                        || existing.sense.part_of_speech != sense.part_of_speech
                        || existing.sense.sense_key != sense.sense_key
                    {
                        result.conflicts.push(FusionConflict {
                            identity_key: sense.identity_key.clone(),
                            detail: "same identity has incompatible semantic fields".to_owned(),
                        });
                    }
                    existing.pack_ids.insert(pack.id.clone());
                }
                None => {
                    result.senses.insert(
                        sense.identity_key.clone(),
                        FusedRecord {
                            sense: sense.clone(),
                            pack_ids: BTreeSet::from([pack.id.clone()]),
                        },
                    );
                }
            }
        }
    }
    result
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum SafePathError {
    #[error("absolute paths are forbidden in imports")]
    Absolute,
    #[error("parent traversal is forbidden in imports")]
    Traversal,
}

pub fn safe_relative_path(value: &Path) -> Result<PathBuf, SafePathError> {
    if value.is_absolute() {
        return Err(SafePathError::Absolute);
    }
    let mut safe = PathBuf::new();
    for component in value.components() {
        match component {
            Component::Normal(part) => safe.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(SafePathError::Traversal)
            }
        }
    }
    Ok(safe)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(id: &str, identity: &str, sense_key: &str) -> SenseRecord {
        SenseRecord {
            id: id.to_owned(),
            identity_key: identity.to_owned(),
            lemma: "bank".to_owned(),
            part_of_speech: "noun".to_owned(),
            sense_key: sense_key.to_owned(),
        }
    }

    fn pack(id: &str, senses: Vec<SenseRecord>) -> PackRecord {
        PackRecord {
            id: id.to_owned(),
            stage: "cet4".to_owned(),
            version: "0.1.0".to_owned(),
            license: "CC0-1.0".to_owned(),
            source_name: "test".to_owned(),
            senses,
        }
    }

    #[test]
    fn merges_membership_for_same_sense() {
        let sense = record("sense.bank.finance", "bank|noun|finance", "finance");
        let result = fuse_packs(&[pack("one", vec![sense.clone()]), pack("two", vec![sense])]);
        assert_eq!(result.senses.len(), 1);
        assert_eq!(result.senses["bank|noun|finance"].pack_ids.len(), 2);
    }

    #[test]
    fn keeps_same_spelling_with_different_senses() {
        let result = fuse_packs(&[pack(
            "one",
            vec![
                record("sense.bank.finance", "bank|noun|finance", "finance"),
                record("sense.bank.river", "bank|noun|river-edge", "river-edge"),
            ],
        )]);
        assert_eq!(result.senses.len(), 2);
    }

    #[test]
    fn rejects_import_traversal() {
        assert_eq!(
            safe_relative_path(Path::new("../secret.json")),
            Err(SafePathError::Traversal)
        );
        assert_eq!(
            safe_relative_path(Path::new("packs/demo.json")).unwrap(),
            PathBuf::from("packs/demo.json")
        );
    }
}
