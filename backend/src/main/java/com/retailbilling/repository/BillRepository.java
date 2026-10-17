package com.retailbilling.repository;

import com.retailbilling.model.Bill;
import com.retailbilling.model.BillItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class BillRepository {

    private final JdbcTemplate jdbcTemplate;

    public BillRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Bill> billRowMapper = new RowMapper<Bill>() {
        @Override
        public Bill mapRow(ResultSet rs, int rowNum) throws SQLException {
            Bill b = new Bill();
            b.setBillId(rs.getLong("bill_id"));
            b.setBillNumber(rs.getString("bill_number"));

            Timestamp billDateTs = rs.getTimestamp("bill_date");
            if (billDateTs != null) {
                b.setBillDate(billDateTs.toLocalDateTime());
            }

            b.setSubtotal(rs.getBigDecimal("subtotal"));
            b.setDiscountAmount(rs.getBigDecimal("discount_amount"));
            b.setTaxableAmount(rs.getBigDecimal("taxable_amount"));
            b.setCgstAmount(rs.getBigDecimal("cgst_amount"));
            b.setSgstAmount(rs.getBigDecimal("sgst_amount"));
            b.setIgstAmount(rs.getBigDecimal("igst_amount"));
            b.setRoundOff(rs.getBigDecimal("round_off"));
            b.setGrandTotal(rs.getBigDecimal("grand_total"));
            b.setPaymentMethod(rs.getString("payment_method"));
            b.setPaymentStatus(rs.getString("payment_status"));

            Timestamp createdTs = rs.getTimestamp("created_at");
            if (createdTs != null) {
                b.setCreatedAt(createdTs.toLocalDateTime());
            }
            return b;
        }
    };

    private final RowMapper<BillItem> billItemRowMapper = new RowMapper<BillItem>() {
        @Override
        public BillItem mapRow(ResultSet rs, int rowNum) throws SQLException {
            BillItem item = new BillItem();
            item.setBillItemId(rs.getLong("bill_item_id"));
            item.setBillId(rs.getLong("bill_id"));
            item.setProductId(rs.getLong("product_id"));
            item.setProductName(rs.getString("product_name"));
            item.setSku(rs.getString("sku"));
            item.setHSNCode(rs.getString("hsn_code"));
            item.setQuantity(rs.getBigDecimal("quantity"));
            item.setUnit(rs.getString("unit"));
            item.setUnitPrice(rs.getBigDecimal("unit_price"));
            item.setMrpAtSale(rs.getBigDecimal("mrp_at_sale"));
            item.setDiscountAmount(rs.getBigDecimal("discount_amount"));
            item.setTaxableAmount(rs.getBigDecimal("taxable_amount"));
            item.setGstRate(rs.getBigDecimal("gst_rate"));
            item.setCgstAmount(rs.getBigDecimal("cgst_amount"));
            item.setSgstAmount(rs.getBigDecimal("sgst_amount"));
            item.setIgstAmount(rs.getBigDecimal("igst_amount"));
            item.setLineTotal(rs.getBigDecimal("line_total"));
            return item;
        }
    };

    public Bill save(Bill bill) {
        String sql = "INSERT INTO bills (bill_number, bill_date, subtotal, discount_amount, taxable_amount, " +
                "cgst_amount, sgst_amount, igst_amount, round_off, grand_total, payment_method, payment_status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, bill.getBillNumber());
            ps.setTimestamp(2, bill.getBillDate() != null ? Timestamp.valueOf(bill.getBillDate()) : new Timestamp(System.currentTimeMillis()));
            ps.setBigDecimal(3, bill.getSubtotal());
            ps.setBigDecimal(4, bill.getDiscountAmount());
            ps.setBigDecimal(5, bill.getTaxableAmount());
            ps.setBigDecimal(6, bill.getCgstAmount());
            ps.setBigDecimal(7, bill.getSgstAmount());
            ps.setBigDecimal(8, bill.getIgstAmount());
            ps.setBigDecimal(9, bill.getRoundOff());
            ps.setBigDecimal(10, bill.getGrandTotal());
            ps.setString(11, bill.getPaymentMethod());
            ps.setString(12, bill.getPaymentStatus());
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            bill.setBillId(keyHolder.getKey().longValue());
        }
        return bill;
    }

    public void saveItems(Long billId, List<BillItem> items) {
        String sql = "INSERT INTO bill_items (bill_id, product_id, product_name, sku, hsn_code, quantity, " +
                "unit, unit_price, mrp_at_sale, discount_amount, taxable_amount, gst_rate, cgst_amount, " +
                "sgst_amount, igst_amount, line_total) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (BillItem item : items) {
            jdbcTemplate.update(sql,
                    billId,
                    item.getProductId(),
                    item.getProductName(),
                    item.getSku(),
                    item.getHSNCode(),
                    item.getQuantity(),
                    item.getUnit(),
                    item.getUnitPrice(),
                    item.getMrpAtSale(),
                    item.getDiscountAmount(),
                    item.getTaxableAmount(),
                    item.getGstRate(),
                    item.getCgstAmount(),
                    item.getSgstAmount(),
                    item.getIgstAmount(),
                    item.getLineTotal()
            );
        }
    }

    public Optional<Bill> findById(Long billId) {
        String sql = "SELECT * FROM bills WHERE bill_id = ?";
        List<Bill> list = jdbcTemplate.query(sql, billRowMapper, billId);
        if (list.isEmpty()) {
            return Optional.empty();
        }
        Bill bill = list.get(0);
        bill.setItems(findItemsByBillId(billId));
        return Optional.of(bill);
    }

    public Optional<Bill> findByBillNumber(String billNumber) {
        String sql = "SELECT * FROM bills WHERE bill_number = ?";
        List<Bill> list = jdbcTemplate.query(sql, billRowMapper, billNumber);
        if (list.isEmpty()) {
            return Optional.empty();
        }
        Bill bill = list.get(0);
        bill.setItems(findItemsByBillId(bill.getBillId()));
        return Optional.of(bill);
    }

    public List<BillItem> findItemsByBillId(Long billId) {
        String sql = "SELECT * FROM bill_items WHERE bill_id = ? ORDER BY bill_item_id ASC";
        return jdbcTemplate.query(sql, billItemRowMapper, billId);
    }

    public List<Bill> findAll(String search, LocalDate startDate, LocalDate endDate, String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM bills WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (search != null && !search.trim().isEmpty()) {
            sql.append("AND LOWER(bill_number) LIKE ? ");
            params.add("%" + search.trim().toLowerCase() + "%");
        }

        if (startDate != null) {
            sql.append("AND bill_date >= ? ");
            params.add(Timestamp.valueOf(startDate.atStartOfDay()));
        }

        if (endDate != null) {
            sql.append("AND bill_date <= ? ");
            params.add(Timestamp.valueOf(endDate.atTime(23, 59, 59)));
        }

        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            sql.append("AND payment_status = ? ");
            params.add(status.trim().toUpperCase());
        }

        sql.append("ORDER BY bill_date DESC, bill_id DESC");

        return jdbcTemplate.query(sql.toString(), billRowMapper, params.toArray());
    }

    public int updateStatus(Long billId, String status) {
        String sql = "UPDATE bills SET payment_status = ? WHERE bill_id = ?";
        return jdbcTemplate.update(sql, status, billId);
    }

    public long countTotalBills() {
        String sql = "SELECT COUNT(*) FROM bills";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0L;
    }

    public BigDecimal getTodaySales() {
        String sql = "SELECT COALESCE(SUM(grand_total), 0) FROM bills " +
                "WHERE DATE(bill_date) = CURRENT_DATE AND payment_status != 'CANCELLED'";
        BigDecimal total = jdbcTemplate.queryForObject(sql, BigDecimal.class);
        return total != null ? total : BigDecimal.ZERO;
    }

    public BigDecimal getTotalSales() {
        String sql = "SELECT COALESCE(SUM(grand_total), 0) FROM bills WHERE payment_status != 'CANCELLED'";
        BigDecimal total = jdbcTemplate.queryForObject(sql, BigDecimal.class);
        return total != null ? total : BigDecimal.ZERO;
    }

    public long getNextBillSequence(LocalDate date) {
        // Count bills generated today to create nice sequence: BILL-YYYYMMDD-XXXX
        String sql = "SELECT COUNT(*) FROM bills WHERE DATE(bill_date) = ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, Date.valueOf(date));
        return (count != null ? count : 0L) + 1;
    }
}
