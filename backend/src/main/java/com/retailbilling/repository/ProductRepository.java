package com.retailbilling.repository;

import com.retailbilling.model.Product;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ProductRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Product> productRowMapper = new RowMapper<Product>() {
        @Override
        public Product mapRow(ResultSet rs, int rowNum) throws SQLException {
            Product p = new Product();
            p.setProductId(rs.getLong("product_id"));
            p.setSku(rs.getString("sku"));
            p.setBarcode(rs.getString("barcode"));
            p.setProductName(rs.getString("product_name"));
            p.setBrand(rs.getString("brand"));
            p.setCategory(rs.getString("category"));
            p.setDescription(rs.getString("description"));
            p.setUnit(rs.getString("unit"));
            p.setPackSize(rs.getString("pack_size"));
            p.setHSNCode(rs.getString("hsn_code"));
            p.setGstRate(rs.getBigDecimal("gst_rate"));
            p.setPurchasePrice(rs.getBigDecimal("purchase_price"));
            p.setMrp(rs.getBigDecimal("mrp"));
            p.setSellingPrice(rs.getBigDecimal("selling_price"));
            p.setStockQuantity(rs.getBigDecimal("stock_quantity"));
            p.setReorderLevel(rs.getBigDecimal("reorder_level"));
            p.setActive(rs.getBoolean("is_active"));

            Timestamp createdTs = rs.getTimestamp("created_at");
            if (createdTs != null) {
                p.setCreatedAt(createdTs.toLocalDateTime());
            }
            Timestamp updatedTs = rs.getTimestamp("updated_at");
            if (updatedTs != null) {
                p.setUpdatedAt(updatedTs.toLocalDateTime());
            }
            return p;
        }
    };

    /**
     * Find products with optional filters for search keyword, category, and active status.
     */
    public List<Product> findAll(String search, String category, Boolean activeOnly, String sortBy, String sortOrder) {
        StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (search != null && !search.trim().isEmpty()) {
            sql.append("AND (LOWER(product_name) LIKE ? OR LOWER(sku) LIKE ? OR barcode = ?) ");
            String term = "%" + search.trim().toLowerCase() + "%";
            params.add(term);
            params.add(term);
            params.add(search.trim());
        }

        if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL")) {
            sql.append("AND category = ? ");
            params.add(category.trim());
        }

        if (activeOnly != null && activeOnly) {
            sql.append("AND is_active = 1 ");
        }

        // Whitelist allowed sort columns to avoid SQL injection
        String validSortBy = "product_name";
        if ("selling_price".equalsIgnoreCase(sortBy)) {
            validSortBy = "selling_price";
        } else if ("stock_quantity".equalsIgnoreCase(sortBy)) {
            validSortBy = "stock_quantity";
        } else if ("category".equalsIgnoreCase(sortBy)) {
            validSortBy = "category";
        } else if ("product_id".equalsIgnoreCase(sortBy)) {
            validSortBy = "product_id";
        }

        String validOrder = "ASC".equalsIgnoreCase(sortOrder) ? "ASC" : "DESC";
        if (sortBy == null) {
            validOrder = "ASC";
        }

        sql.append("ORDER BY ").append(validSortBy).append(" ").append(validOrder);

        return jdbcTemplate.query(sql.toString(), productRowMapper, params.toArray());
    }

    public Optional<Product> findById(Long productId) {
        String sql = "SELECT * FROM products WHERE product_id = ?";
        List<Product> list = jdbcTemplate.query(sql, productRowMapper, productId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<Product> findBySku(String sku) {
        String sql = "SELECT * FROM products WHERE sku = ?";
        List<Product> list = jdbcTemplate.query(sql, productRowMapper, sku);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<Product> findByBarcode(String barcode) {
        String sql = "SELECT * FROM products WHERE barcode = ?";
        List<Product> list = jdbcTemplate.query(sql, productRowMapper, barcode);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<String> findAllCategories() {
        String sql = "SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category ASC";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public List<Product> findLowStockProducts(int limit) {
        String sql = "SELECT * FROM products WHERE stock_quantity <= reorder_level AND is_active = 1 ORDER BY stock_quantity ASC LIMIT ?";
        return jdbcTemplate.query(sql, productRowMapper, limit);
    }

    public long countTotal() {
        String sql = "SELECT COUNT(*) FROM products";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0L;
    }

    public long countActive() {
        String sql = "SELECT COUNT(*) FROM products WHERE is_active = 1";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0L;
    }

    public long countLowStock() {
        String sql = "SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level AND is_active = 1";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0L;
    }

    public boolean existsBySku(String sku, Long excludeId) {
        if (excludeId != null) {
            String sql = "SELECT COUNT(*) FROM products WHERE sku = ? AND product_id != ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, sku, excludeId);
            return count != null && count > 0;
        } else {
            String sql = "SELECT COUNT(*) FROM products WHERE sku = ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, sku);
            return count != null && count > 0;
        }
    }

    public boolean existsByBarcode(String barcode, Long excludeId) {
        if (barcode == null || barcode.trim().isEmpty()) {
            return false;
        }
        if (excludeId != null) {
            String sql = "SELECT COUNT(*) FROM products WHERE barcode = ? AND product_id != ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, barcode, excludeId);
            return count != null && count > 0;
        } else {
            String sql = "SELECT COUNT(*) FROM products WHERE barcode = ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, barcode);
            return count != null && count > 0;
        }
    }

    public Product save(Product product) {
        String sql = "INSERT INTO products (sku, barcode, product_name, brand, category, description, unit, " +
                "pack_size, hsn_code, gst_rate, purchase_price, mrp, selling_price, stock_quantity, reorder_level, is_active) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, product.getSku());
            ps.setString(2, product.getBarcode());
            ps.setString(3, product.getProductName());
            ps.setString(4, product.getBrand());
            ps.setString(5, product.getCategory());
            ps.setString(6, product.getDescription());
            ps.setString(7, product.getUnit() != null ? product.getUnit() : "piece");
            ps.setString(8, product.getPackSize());
            ps.setString(9, product.getHSNCode());
            ps.setBigDecimal(10, product.getGstRate());
            ps.setBigDecimal(11, product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO);
            ps.setBigDecimal(12, product.getMrp());
            ps.setBigDecimal(13, product.getSellingPrice());
            ps.setBigDecimal(14, product.getStockQuantity() != null ? product.getStockQuantity() : BigDecimal.ZERO);
            ps.setBigDecimal(15, product.getReorderLevel() != null ? product.getReorderLevel() : new BigDecimal("5.000"));
            ps.setBoolean(16, product.isActive());
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            product.setProductId(keyHolder.getKey().longValue());
        }
        return product;
    }

    public int update(Product product) {
        String sql = "UPDATE products SET sku = ?, barcode = ?, product_name = ?, brand = ?, category = ?, " +
                "description = ?, unit = ?, pack_size = ?, hsn_code = ?, gst_rate = ?, purchase_price = ?, " +
                "mrp = ?, selling_price = ?, stock_quantity = ?, reorder_level = ?, is_active = ? " +
                "WHERE product_id = ?";

        return jdbcTemplate.update(sql,
                product.getSku(),
                product.getBarcode(),
                product.getProductName(),
                product.getBrand(),
                product.getCategory(),
                product.getDescription(),
                product.getUnit(),
                product.getPackSize(),
                product.getHSNCode(),
                product.getGstRate(),
                product.getPurchasePrice(),
                product.getMrp(),
                product.getSellingPrice(),
                product.getStockQuantity(),
                product.getReorderLevel(),
                product.isActive(),
                product.getProductId()
        );
    }

    public int updateStock(Long productId, BigDecimal newQuantity) {
        String sql = "UPDATE products SET stock_quantity = ? WHERE product_id = ?";
        return jdbcTemplate.update(sql, newQuantity, productId);
    }

    /**
     * Atomically deduct stock quantity. Returns rows affected.
     * If 0 rows affected, it means stock is insufficient or product does not exist.
     */
    public int deductStock(Long productId, BigDecimal quantity) {
        String sql = "UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?";
        return jdbcTemplate.update(sql, quantity, productId, quantity);
    }

    public int restoreStock(Long productId, BigDecimal quantity) {
        String sql = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?";
        return jdbcTemplate.update(sql, quantity, productId);
    }

    public int updateStatus(Long productId, boolean active) {
        String sql = "UPDATE products SET is_active = ? WHERE product_id = ?";
        return jdbcTemplate.update(sql, active, productId);
    }
}
