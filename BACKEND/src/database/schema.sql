-- ============================================================
--  SYNCRA POS — MySQL Production Schema
--  Engine  : InnoDB  |  Charset : utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS syncra_pos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE syncra_pos;

-- ── 1. ROLES ────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)         NOT NULL,
    description TEXT                NULL,
    created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. USERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    role_id         INT UNSIGNED        NOT NULL,
    full_name       VARCHAR(150)        NOT NULL,
    email           VARCHAR(255)        NOT NULL,
    phone           VARCHAR(20)         NULL,
    password_hash   TEXT                NOT NULL,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role_id (role_id),
    INDEX idx_users_deleted (deleted_at),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. CUSTOMERS ────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id          BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    full_name   VARCHAR(150)        NOT NULL,
    email       VARCHAR(255)        NULL,
    phone       VARCHAR(20)         NULL,
    address     TEXT                NULL,
    notes       TEXT                NULL,
    created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_email (email),
    UNIQUE KEY uq_customers_phone (phone),
    INDEX idx_customers_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. CATEGORIES ───────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    parent_id   INT UNSIGNED        NULL,
    name        VARCHAR(100)        NOT NULL,
    slug        VARCHAR(120)        NOT NULL,
    description TEXT                NULL,
    sort_order  SMALLINT            NOT NULL DEFAULT 0,
    is_active   TINYINT(1)          NOT NULL DEFAULT 1,
    created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug),
    INDEX idx_categories_parent (parent_id),
    INDEX idx_categories_deleted (deleted_at),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. PRODUCTS ─────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    category_id     INT UNSIGNED        NOT NULL,
    name            VARCHAR(200)        NOT NULL,
    slug            VARCHAR(220)        NOT NULL,
    description     TEXT                NULL,
    image_url       TEXT                NULL,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_slug (slug),
    INDEX idx_products_category (category_id),
    INDEX idx_products_deleted (deleted_at),
    FULLTEXT INDEX ftx_products_name (name),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. PRODUCT VARIANTS ─────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    product_id      BIGINT UNSIGNED     NOT NULL,
    name            VARCHAR(100)        NOT NULL,
    sku             VARCHAR(100)        NULL,
    price           DECIMAL(12,2)       NOT NULL,
    is_default      TINYINT(1)          NOT NULL DEFAULT 0,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pv_sku (sku),
    INDEX idx_pv_product (product_id),
    INDEX idx_pv_deleted (deleted_at),
    CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_pv_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. ADDONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS addons (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    category_id     INT UNSIGNED        NULL,
    name            VARCHAR(150)        NOT NULL,
    price           DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    is_active       TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    INDEX idx_addons_category (category_id),
    INDEX idx_addons_deleted (deleted_at),
    CONSTRAINT fk_addons_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_addons_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. ORDER STATUSES ───────────────────────
CREATE TABLE IF NOT EXISTS order_statuses (
    id          INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)         NOT NULL,
    description TEXT                NULL,
    sort_order  SMALLINT            NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_statuses_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. PAYMENT METHODS ──────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
    id          INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    name        VARCHAR(80)         NOT NULL,
    description TEXT                NULL,
    is_active   TINYINT(1)          NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_methods_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. ORDERS ──────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                  BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    customer_id         BIGINT UNSIGNED     NULL,
    cashier_id          BIGINT UNSIGNED     NOT NULL,
    status_id           INT UNSIGNED        NOT NULL,
    order_number        VARCHAR(30)         NOT NULL,
    table_number        VARCHAR(20)         NULL,
    subtotal            DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    discount_amount     DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    tax_amount          DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    total_amount        DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    notes               TEXT                NULL,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_order_number (order_number),
    INDEX idx_orders_cashier (cashier_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_status (status_id),
    INDEX idx_orders_created_at (created_at),
    INDEX idx_orders_deleted (deleted_at),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_orders_cashier FOREIGN KEY (cashier_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_status FOREIGN KEY (status_id) REFERENCES order_statuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_orders_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_orders_tax CHECK (tax_amount >= 0),
    CONSTRAINT chk_orders_total CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. ORDER ITEMS ─────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id                      BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    order_id                BIGINT UNSIGNED     NOT NULL,
    product_variant_id      BIGINT UNSIGNED     NOT NULL,
    product_name            VARCHAR(200)        NOT NULL,
    variant_name            VARCHAR(100)        NOT NULL,
    unit_price              DECIMAL(12,2)       NOT NULL,
    quantity                INT UNSIGNED        NOT NULL,
    discount_amount         DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    line_total              DECIMAL(12,2)       NOT NULL,
    notes                   TEXT                NULL,
    created_at              DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_oi_order (order_id),
    INDEX idx_oi_variant (product_variant_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_oi_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_oi_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_oi_quantity CHECK (quantity > 0),
    CONSTRAINT chk_oi_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_oi_line_total CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. ORDER ITEM ADDONS ───────────────────
CREATE TABLE IF NOT EXISTS order_item_addons (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    order_item_id   BIGINT UNSIGNED     NOT NULL,
    addon_id        BIGINT UNSIGNED     NOT NULL,
    addon_name      VARCHAR(150)        NOT NULL,
    unit_price      DECIMAL(12,2)       NOT NULL,
    quantity        INT UNSIGNED        NOT NULL DEFAULT 1,
    line_total      DECIMAL(12,2)       NOT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_oia_order_item (order_item_id),
    INDEX idx_oia_addon (addon_id),
    CONSTRAINT fk_oia_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_oia_addon FOREIGN KEY (addon_id) REFERENCES addons(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_oia_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_oia_quantity CHECK (quantity > 0),
    CONSTRAINT chk_oia_line_total CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. PAYMENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    order_id            BIGINT UNSIGNED     NOT NULL,
    payment_method_id   INT UNSIGNED        NOT NULL,
    processed_by        BIGINT UNSIGNED     NULL,
    amount              DECIMAL(12,2)       NOT NULL,
    change_amount       DECIMAL(12,2)       NOT NULL DEFAULT 0.00,
    reference_number    VARCHAR(100)        NULL,
    paid_at             DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes               TEXT                NULL,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_payments_order (order_id),
    INDEX idx_payments_method (payment_method_id),
    INDEX idx_payments_paid_at (paid_at),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payments_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payments_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT chk_payments_change CHECK (change_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 14. STOCK MOVEMENTS ─────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
    id                      BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    product_variant_id      BIGINT UNSIGNED     NOT NULL,
    order_item_id           BIGINT UNSIGNED     NULL,
    performed_by            BIGINT UNSIGNED     NULL,
    quantity_change         DECIMAL(10,3)       NOT NULL,
    movement_type           VARCHAR(50)         NOT NULL,
    reference               VARCHAR(150)        NULL,
    notes                   TEXT                NULL,
    created_at              DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_sm_variant (product_variant_id),
    INDEX idx_sm_order_item (order_item_id),
    INDEX idx_sm_created (created_at),
    INDEX idx_sm_type (movement_type),
    CONSTRAINT fk_sm_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_sm_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_sm_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. ORDER STATUS LOGS ───────────────────
CREATE TABLE IF NOT EXISTS order_status_logs (
    id              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED     NOT NULL,
    from_status_id  INT UNSIGNED        NULL,
    to_status_id    INT UNSIGNED        NOT NULL,
    changed_by      BIGINT UNSIGNED     NULL,
    reason          TEXT                NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_osl_order (order_id),
    INDEX idx_osl_created (created_at),
    INDEX idx_osl_to_status (to_status_id),
    CONSTRAINT fk_osl_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_osl_from_status FOREIGN KEY (from_status_id) REFERENCES order_statuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_osl_to_status FOREIGN KEY (to_status_id) REFERENCES order_statuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_osl_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── SEED DATA ───────────────────────────────
INSERT IGNORE INTO roles (name, description) VALUES
    ('admin',   'Full system access'),
    ('cashier', 'POS terminal operator'),
    ('manager', 'Store manager with reports access');

INSERT IGNORE INTO order_statuses (name, description, sort_order) VALUES
    ('pending',     'Order placed, awaiting payment',       1),
    ('processing',  'Payment received, being prepared',     2),
    ('completed',   'Order fulfilled and closed',           3),
    ('cancelled',   'Order cancelled before fulfilment',    4),
    ('refunded',    'Payment returned to customer',         5);

INSERT IGNORE INTO payment_methods (name, description) VALUES
    ('cash',        'Physical cash'),
    ('debit_card',  'Debit card payment'),
    ('credit_card', 'Credit card payment'),
    ('qr_payment',  'QR-code payment (QRIS, DuitNow)'),
    ('e_wallet',    'Digital wallet (GoPay, OVO, Dana)'),
    ('voucher',     'Gift or promotional voucher');
