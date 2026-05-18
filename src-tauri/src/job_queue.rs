#![allow(dead_code)]

use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobStatus {
    pub id: String,
    pub name: String,
    pub status: String,
    pub progress: u8,
    pub message: String,
}

pub struct JobManager {
    jobs: HashMap<String, JobStatus>,
}

impl JobManager {
    pub fn new() -> Self {
        Self {
            jobs: HashMap::new(),
        }
    }

    pub fn start(&mut self, id: &str, name: &str) {
        self.jobs.insert(
            id.to_string(),
            JobStatus {
                id: id.to_string(),
                name: name.to_string(),
                status: "running".to_string(),
                progress: 0,
                message: "시작됨".to_string(),
            },
        );
    }

    pub fn progress(&mut self, id: &str, progress: u8, message: &str) {
        if let Some(job) = self.jobs.get_mut(id) {
            job.progress = progress;
            job.message = message.to_string();
        }
    }

    pub fn complete(&mut self, id: &str, message: &str) {
        if let Some(job) = self.jobs.get_mut(id) {
            job.status = "completed".to_string();
            job.progress = 100;
            job.message = message.to_string();
        }
    }

    pub fn fail(&mut self, id: &str, message: &str) {
        if let Some(job) = self.jobs.get_mut(id) {
            job.status = "failed".to_string();
            job.message = message.to_string();
        }
    }

    pub fn get(&self, id: &str) -> Option<JobStatus> {
        self.jobs.get(id).cloned()
    }

    pub fn all_active(&self) -> Vec<JobStatus> {
        self.jobs
            .values()
            .filter(|j| j.status == "running")
            .cloned()
            .collect()
    }
}

pub type JobManagerState = Arc<Mutex<JobManager>>;

pub fn new_job_manager() -> JobManagerState {
    Arc::new(Mutex::new(JobManager::new()))
}
