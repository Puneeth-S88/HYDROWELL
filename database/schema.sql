-- ============================================================================
-- HYDROWELL / Sri Anantashayana Borewells & Pumps
-- Database Schema Definition & Migration
-- Target Database: borewell_db
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `borewell_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `borewell_db`;

-- ----------------------------------------------------------------------------
-- 1. Table: inquiries (Preserved & Enhanced)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `location` VARCHAR(150) DEFAULT NULL,
    `service` VARCHAR(100) DEFAULT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: feedback (Preserved & Enhanced)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedback` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) DEFAULT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT NOT NULL,
    `photo` VARCHAR(255) DEFAULT NULL,
    `status` VARCHAR(20) DEFAULT 'approved',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_rating` (`rating`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: bookings (New Dedicated Full-Stack Booking Entity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(120) DEFAULT NULL,
    `location` VARCHAR(200) NOT NULL,
    `service` VARCHAR(100) NOT NULL,
    `preferred_date` VARCHAR(50) DEFAULT NULL,
    `depth_feet` VARCHAR(50) DEFAULT NULL,
    `message` TEXT DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'confirmed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_booking_id` (`booking_id`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
