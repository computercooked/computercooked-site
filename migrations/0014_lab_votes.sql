-- /lab "vote on the next game" (K-0031 item 10): one vote per player per poll; changing it overwrites
CREATE TABLE IF NOT EXISTS lab_votes (
  poll TEXT NOT NULL, voter TEXT NOT NULL, option TEXT NOT NULL, ts INTEGER NOT NULL,
  PRIMARY KEY (poll, voter) );
