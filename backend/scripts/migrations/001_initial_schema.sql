-- Initial Schema Migration
-- Beauty Studio Database Setup
-- Version: 1.0.0
-- Date: 2024-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types if they don't exist
DO $$ BEGIN
    CREATE TYPE IF NOT EXISTS "user_role" AS ENUM ('client', 'master', 'manager', 'owner');
    CREATE TYPE IF NOT EXISTS "booking_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
    CREATE TYPE IF NOT EXISTS "reminder_type" AS ENUM ('booking_reminder_24h', 'booking_reminder_2h', 'birthday', 'loyalty', 'promotion');
    CREATE TYPE IF NOT EXISTS "notification_channel" AS ENUM ('telegram', 'email', 'sms', 'push');
    CREATE TYPE IF NOT EXISTS "shift_type" AS ENUM ('morning', 'afternoon', 'evening', 'full_day', 'flexible', 'weekend');
    CREATE TYPE IF NOT EXISTS "work_status" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'absent', 'late', 'sick_leave', 'vacation');
    CREATE TYPE IF NOT EXISTS "campaign_type" AS ENUM ('promotion', 'newsletter', 'survey', 'announcement', 'reengagement', 'birthday');
    CREATE TYPE IF NOT EXISTS "campaign_status" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');
    CREATE TYPE IF NOT EXISTS "message_channel" AS ENUM ('email', 'sms', 'telegram', 'push', 'all');
    CREATE TYPE IF NOT EXISTS "employee_status" AS ENUM ('active', 'on_leave', 'vacation', 'sick_leave', 'terminated', 'probation');
    CREATE TYPE IF NOT EXISTS "kpi_type" AS ENUM ('revenue', 'bookings', 'client_retention', 'rating', 'punctuality', 'upsales', 'attendance');
    CREATE TYPE IF NOT EXISTS "performance_level" AS ENUM ('excellent', 'good', 'satisfactory', 'needs_improvement', 'poor');
$$ LANGUAGE 'plpgsql';

-- Create indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_chat_id ON bookings(chat_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service);
CREATE INDEX IF NOT EXISTS idx_clients_role ON clients(role);
CREATE INDEX IF NOT EXISTS idx_clients_chat_id ON clients(chat_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Add new columns to existing tables if they don't exist
DO $$ BEGIN
    -- Add missing columns to clients table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'first_visit') THEN
        ALTER TABLE clients ADD COLUMN first_visit TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'last_visit') THEN
        ALTER TABLE clients ADD COLUMN last_visit TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_active') THEN
        ALTER TABLE clients ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN
        ALTER TABLE clients ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'metadata') THEN
        ALTER TABLE clients ADD COLUMN metadata JSONB;
    END IF;
    
    -- Add missing columns to bookings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'created_at') THEN
        ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'updated_at') THEN
        ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE bookings ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'metadata') THEN
        ALTER TABLE bookings ADD COLUMN metadata JSONB;
    END IF;
    
    -- Add missing columns to services table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'created_at') THEN
        ALTER TABLE services ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'updated_at') THEN
        ALTER TABLE services ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_active') THEN
        ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE services ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description') THEN
        ALTER TABLE services ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'duration_minutes') THEN
        ALTER TABLE services ADD COLUMN duration_minutes INTEGER DEFAULT 60;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'metadata') THEN
        ALTER TABLE services ADD COLUMN metadata JSONB;
    END IF;
$$ LANGUAGE 'plpgsql';

-- Create trigger functions for updated_at
DO $$ BEGIN
    -- Function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE 'plpgsql';
    
    -- Create triggers for updated_at
    DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
    CREATE TRIGGER update_clients_updated_at
        BEFORE UPDATE ON clients
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
    CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_services_updated_at ON services;
    CREATE TRIGGER update_services_updated_at
        BEFORE UPDATE ON services
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
$$ LANGUAGE 'plpgsql';

-- Insert initial data if tables are empty
DO $$ BEGIN
    -- Create default services if services table is empty
    IF (SELECT COUNT(*) FROM services) = 0 THEN
        INSERT INTO services (name, description, price, duration_minutes, category) VALUES
        ('Стрижка', 'Классическая стрижка с укладкой', 1500, 60, 'haircut'),
        ('Окрашивание', 'Окрашивание волос профессиональными красителями', 3000, 180, 'coloring'),
        ('Маникюр', 'Классический маникюр с покрытием', 1200, 90, 'nails'),
        ('Педикюр', 'Аппаратный и классический педикюр', 1500, 90, 'nails'),
        ('Укладка', 'Сложная укладка для особого случая', 2000, 120, 'styling'),
        ('Чистка лица', 'Глубокая чистка лица с пилингом', 2000, 90, 'skincare'),
        ('Массаж', 'Расслабляющий массаж всего тела', 2500, 60, 'massage'),
        ('Брови', 'Коррекция и окрашивание бровей', 800, 45, 'eyebrows');
    END IF;
    
    -- Create default admin user if no admin exists
    IF (SELECT COUNT(*) FROM clients WHERE role = 'owner') = 0 THEN
        INSERT INTO clients (name, phone, email, role, is_active, created_at) VALUES
        ('Admin User', '+99670000000', 'admin@beautystudio.com', 'owner', true, CURRENT_TIMESTAMP);
    END IF;
    
    -- Create default slots if slots table is empty
    IF (SELECT COUNT(*) FROM slots) = 0 THEN
        -- Generate slots for next 30 days
        INSERT INTO slots (date, time, service_id, is_available)
        SELECT 
            CURRENT_DATE + INTERVAL '1 day' * generate_series,
            s.time,
            s.id,
            true
        FROM services s
        CROSS JOIN (
            SELECT generate_series(
                '09:00'::TIME,
                '21:00'::TIME,
                '30 minutes'::INTERVAL
            ) as time
        ) s
        WHERE CURRENT_DATE + INTERVAL '1 day' * generate_series <= CURRENT_DATE + INTERVAL '30 days';
    END IF;
$$ LANGUAGE 'plpgsql';

-- Create views for common queries
CREATE OR REPLACE VIEW client_bookings AS
SELECT 
    b.id,
    b.date,
    b.time,
    b.service_id,
    s.name as service_name,
    b.price,
    b.status,
    c.name as client_name,
    c.phone as client_phone,
    c.email as client_email,
    b.created_at,
    b.updated_at
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN clients c ON b.chat_id = c.id;

CREATE OR REPLACE VIEW master_schedule AS
SELECT 
    c.name as master_name,
    c.phone as master_phone,
    b.date,
    b.time,
    s.name as service_name,
    b.status,
    b.created_at
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN clients c ON b.chat_id = c.id
WHERE c.role = 'master'
ORDER BY b.date, b.time;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_available_slots(target_date DATE, service_id_param INTEGER)
RETURNS TABLE(time TIME, is_available BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT time, is_available
    FROM slots
    WHERE date = target_date 
    AND (service_id IS NULL OR service_id = service_id_param)
    ORDER BY time;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION check_booking_conflict(
    master_id_param INTEGER,
    target_date_param DATE,
    target_time_param TIME
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE chat_id = master_id_param
    AND date = target_date_param
    AND time = target_time_param
    AND status NOT IN ('cancelled', 'completed');
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE 'plpgsql';

-- Add constraints
DO $$ BEGIN
    -- Add unique constraint for user emails
    ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);
    
    -- Add check constraints for bookings
    ALTER TABLE bookings ADD CONSTRAINT bookings_price_check CHECK (price >= 0);
    ALTER TABLE bookings ADD CONSTRAINT bookings_time_check CHECK (time >= '09:00'::TIME AND time <= '21:00'::TIME);
    
    -- Add check constraints for services
    ALTER TABLE services ADD CONSTRAINT services_price_check CHECK (price >= 0);
    ALTER TABLE services ADD CONSTRAINT services_duration_check CHECK (duration_minutes > 0);
    
    -- Add foreign key constraints if they don't exist
    ALTER TABLE bookings ADD CONSTRAINT bookings_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
    
    ALTER TABLE bookings ADD CONSTRAINT bookings_chat_id_fkey 
        FOREIGN KEY (chat_id) REFERENCES clients(id) ON DELETE CASCADE;
$$ LANGUAGE 'plpgsql';

-- Create audit table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Create audit trigger function
DO $$ BEGIN
    CREATE OR REPLACE FUNCTION audit_trigger_function()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'DELETE' THEN
            INSERT INTO audit_log (table_name, operation, user_id, old_values, new_values)
            VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD), NULL);
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_log (table_name, operation, user_id, old_values, new_values)
                VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW));
        ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO audit_log (table_name, operation, user_id, old_values, new_values)
                VALUES (TG_TABLE_NAME, TG_OP, NEW.id, NULL, row_to_json(NEW));
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE 'plpgsql';
    
    -- Create audit triggers
    CREATE TRIGGER audit_clients_trigger
        AFTER INSERT OR UPDATE OR DELETE ON clients
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    CREATE TRIGGER audit_bookings_trigger
        AFTER INSERT OR UPDATE OR DELETE ON bookings
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    CREATE TRIGGER audit_services_trigger
        AFTER INSERT OR UPDATE OR DELETE ON services
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
$$ LANGUAGE 'plpgsql';

-- Insert migration record
INSERT INTO schema_migrations (version, description, applied_at, success)
VALUES ('001_initial_schema', 'Initial database schema setup', CURRENT_TIMESTAMP, true)
ON CONFLICT (version) DO UPDATE SET 
    description = EXCLUDED.description,
    applied_at = CURRENT_TIMESTAMP,
    success = true;
