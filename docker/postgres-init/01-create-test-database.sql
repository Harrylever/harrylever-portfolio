-- Runs once, when the local Postgres volume is first created.
-- The dev database (POSTGRES_DB) is created by the image; add the test one.
CREATE DATABASE harrylever_portfolio_test;
