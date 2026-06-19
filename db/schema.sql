CREATE DATABASE IF NOT EXISTS github_analyzer;
USE github_analyzer;

CREATE TABLE IF NOT EXISTS profiles (
  id                          INT AUTO_INCREMENT PRIMARY KEY,
  username                    VARCHAR(255) NOT NULL UNIQUE,
  github_id                   BIGINT,
  name                        VARCHAR(255),
  avatar_url                  VARCHAR(512),
  bio                         TEXT,
  company                     VARCHAR(255),
  location                    VARCHAR(255),
  blog                        VARCHAR(512),
  email                       VARCHAR(255),
  twitter_username            VARCHAR(255),

  -- core counts
  public_repos                INT DEFAULT 0,
  public_gists                INT DEFAULT 0,
  followers                   INT DEFAULT 0,
  following                   INT DEFAULT 0,

  -- derived insights (computed from the user's repos)
  total_stars                 INT DEFAULT 0,
  total_forks                 INT DEFAULT 0,
  most_used_language          VARCHAR(100),
  language_breakdown          JSON,
  top_starred_repo            VARCHAR(255),
  top_starred_repo_stars      INT DEFAULT 0,

  -- derived insights (computed from the account itself)
  account_created_at          DATETIME,
  account_age_days            INT,
  follower_following_ratio    DECIMAL(10, 2),

  profile_url                 VARCHAR(512),
  last_analyzed_at            DATETIME,

  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_followers (followers),
  INDEX idx_public_repos (public_repos),
  INDEX idx_total_stars (total_stars)
);
