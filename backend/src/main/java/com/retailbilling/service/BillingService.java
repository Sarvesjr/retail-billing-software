package com.retailbilling.service;

import com.retailbilling.config.StoreConfig;
import com.retailbilling.dto.BillItemRequest;
import com.retailbilling.dto.CreateBillRequest;
import com.retailbilling.exception.BadRequestException;
import com.retailbilling.exception.InsufficientStockException;
import com.retailbilling.exception.ResourceNotFoundException;
import com.retailbilling.model.Bill;
import com.retailbilling.model.BillItem;
import com.retailbilling.model.Product;
import com.retailbilling.repository.BillRepository;
import com.retailbilling.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class BillingService {

    private final BillRepository billRepository;
    private final ProductRepository productRepository;
    private final StoreConfig storeConfig;

    public BillingService(BillRepository billRepository, ProductRepository productRepository, StoreConfig storeConfig) {
        this.billRepository = billRepository;
        this.productRepository = productRepository;
        this.storeConfig = storeConfig;
    }

    /**
     * Creates a new bill inside an atomic database transaction.
     * Prices and GST rates are read authoritatively from MySQL.
     * Product stock is safely deducted.
     */
    @Transactional(rollbackFor = Exception.class)
    public Bill createBill(CreateBillRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Bill must contain at least one product item.");
        }

        String taxMode = request.getTaxMode();
        if (taxMode == null || taxMode.trim().isEmpty()) {
            taxMode = storeConfig.getTaxMode();
        }
        boolean isInterState = "INTER_STATE".equalsIgnoreCase(taxMode);

        List<BillItem> processedItems = new ArrayList<>();
        BigDecimal totalSubtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        BigDecimal totalIgst = BigDecimal.ZERO;

        for (BillItemRequest itemReq : request.getItems()) {
            if (itemReq.getProductId() == null) {
                throw new BadRequestException("Product ID cannot be null in bill item.");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Quantity must be greater than zero.");
            }

            // 1. Fetch authoritative product record from DB
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product with ID " + itemReq.getProductId() + " not found."));

            if (!product.isActive()) {
                throw new BadRequestException("Product '" + product.getProductName() + "' is inactive and cannot be billed.");
            }

            // 2. Check stock availability
            BigDecimal requestedQty = itemReq.getQuantity().setScale(3, RoundingMode.HALF_UP);
            if (product.getStockQuantity().compareTo(requestedQty) < 0) {
                throw new InsufficientStockException("Insufficient stock for product '" + product.getProductName() +
                        "'. Available: " + product.getStockQuantity() + " " + product.getUnit() +
                        ", Requested: " + requestedQty);
            }

            // 3. Atomically deduct stock from MySQL
            int updatedRows = productRepository.deductStock(product.getProductId(), requestedQty);
            if (updatedRows == 0) {
                throw new InsufficientStockException("Could not deduct stock for '" + product.getProductName() +
                        "'. Stock may have changed concurrently.");
            }

            // 4. Authoritative pricing calculations
            // NOTE: Selling price in this database is treated as GST-inclusive.
            BigDecimal unitPrice = product.getSellingPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal mrpAtSale = product.getMrp().setScale(2, RoundingMode.HALF_UP);
            BigDecimal gstRate = product.getGstRate() != null ? product.getGstRate().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            BigDecimal grossAmount = unitPrice.multiply(requestedQty).setScale(2, RoundingMode.HALF_UP);

            BigDecimal lineDiscount = itemReq.getDiscountAmount() != null ? itemReq.getDiscountAmount() : BigDecimal.ZERO;
            if (lineDiscount.compareTo(BigDecimal.ZERO) < 0) {
                lineDiscount = BigDecimal.ZERO;
            }
            if (lineDiscount.compareTo(grossAmount) > 0) {
                lineDiscount = grossAmount; // Discount cannot exceed gross amount
            }
            lineDiscount = lineDiscount.setScale(2, RoundingMode.HALF_UP);

            BigDecimal lineTotal = grossAmount.subtract(lineDiscount).setScale(2, RoundingMode.HALF_UP);

            // Calculate Taxable Amount from GST-inclusive amount:
            // taxable_amount = line_total / (1 + gst_rate / 100)
            BigDecimal taxableAmount;
            BigDecimal lineTax;
            BigDecimal lineCgst = BigDecimal.ZERO;
            BigDecimal lineSgst = BigDecimal.ZERO;
            BigDecimal lineIgst = BigDecimal.ZERO;

            if (gstRate.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal divisor = BigDecimal.ONE.add(gstRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                taxableAmount = lineTotal.divide(divisor, 2, RoundingMode.HALF_UP);
                lineTax = lineTotal.subtract(taxableAmount).setScale(2, RoundingMode.HALF_UP);

                if (isInterState) {
                    lineIgst = lineTax;
                } else {
                    // Intra-state: split into CGST (50%) and SGST (50%)
                    lineCgst = lineTax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                    lineSgst = lineTax.subtract(lineCgst).setScale(2, RoundingMode.HALF_UP);
                }
            } else {
                taxableAmount = lineTotal;
                lineTax = BigDecimal.ZERO;
            }

            BillItem billItem = new BillItem();
            billItem.setProductId(product.getProductId());
            billItem.setProductName(product.getProductName());
            billItem.setSku(product.getSku());
            billItem.setHSNCode(product.getHSNCode());
            billItem.setQuantity(requestedQty);
            billItem.setUnit(product.getUnit());
            billItem.setUnitPrice(unitPrice);
            billItem.setMrpAtSale(mrpAtSale);
            billItem.setDiscountAmount(lineDiscount);
            billItem.setTaxableAmount(taxableAmount);
            billItem.setGstRate(gstRate);
            billItem.setCgstAmount(lineCgst);
            billItem.setSgstAmount(lineSgst);
            billItem.setIgstAmount(lineIgst);
            billItem.setLineTotal(lineTotal);

            processedItems.add(billItem);

            totalSubtotal = totalSubtotal.add(grossAmount);
            totalDiscount = totalDiscount.add(lineDiscount);
            totalTaxable = totalTaxable.add(taxableAmount);
            totalCgst = totalCgst.add(lineCgst);
            totalSgst = totalSgst.add(lineSgst);
            totalIgst = totalIgst.add(lineIgst);
        }

        // Additional bill-level discount (if any)
        BigDecimal extraDiscount = request.getAdditionalDiscount() != null ? request.getAdditionalDiscount() : BigDecimal.ZERO;
        if (extraDiscount.compareTo(BigDecimal.ZERO) < 0) {
            extraDiscount = BigDecimal.ZERO;
        }
        totalDiscount = totalDiscount.add(extraDiscount).setScale(2, RoundingMode.HALF_UP);

        BigDecimal netPayable = totalTaxable.add(totalCgst).add(totalSgst).add(totalIgst).subtract(extraDiscount);
        if (netPayable.compareTo(BigDecimal.ZERO) < 0) {
            netPayable = BigDecimal.ZERO;
        }

        // Round off to nearest rupee for standard retail receipt
        BigDecimal roundedTotal = netPayable.setScale(0, RoundingMode.HALF_UP).setScale(2, RoundingMode.HALF_UP);
        BigDecimal roundOff = roundedTotal.subtract(netPayable).setScale(2, RoundingMode.HALF_UP);

        String paymentMethod = request.getPaymentMethod();
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            paymentMethod = "CASH";
        }

        // Build Bill entity
        Bill bill = new Bill();
        bill.setBillNumber(generateUniqueBillNumber());
        bill.setBillDate(LocalDateTime.now());
        bill.setSubtotal(totalSubtotal.setScale(2, RoundingMode.HALF_UP));
        bill.setDiscountAmount(totalDiscount);
        bill.setTaxableAmount(totalTaxable.setScale(2, RoundingMode.HALF_UP));
        bill.setCgstAmount(totalCgst.setScale(2, RoundingMode.HALF_UP));
        bill.setSgstAmount(totalSgst.setScale(2, RoundingMode.HALF_UP));
        bill.setIgstAmount(totalIgst.setScale(2, RoundingMode.HALF_UP));
        bill.setRoundOff(roundOff);
        bill.setGrandTotal(roundedTotal);
        bill.setPaymentMethod(paymentMethod.toUpperCase());
        bill.setPaymentStatus("PAID");

        // Save bill header
        Bill savedBill = billRepository.save(bill);

        // Save bill line items
        billRepository.saveItems(savedBill.getBillId(), processedItems);

        savedBill.setItems(processedItems);
        return savedBill;
    }

    public List<Bill> getAllBills(String search, LocalDate startDate, LocalDate endDate, String status) {
        return billRepository.findAll(search, startDate, endDate, status);
    }

    public Bill getBillById(Long billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found with ID: " + billId));
    }

    public Bill getBillByNumber(String billNumber) {
        return billRepository.findByBillNumber(billNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found with number: " + billNumber));
    }

    /**
     * Cancels an existing bill and safely restores product stock inside a single transaction.
     */
    @Transactional(rollbackFor = Exception.class)
    public Bill cancelBill(Long billId) {
        Bill bill = getBillById(billId);

        if ("CANCELLED".equalsIgnoreCase(bill.getPaymentStatus())) {
            throw new BadRequestException("Bill #" + bill.getBillNumber() + " is already cancelled.");
        }

        // Restore stock for all products in this bill
        List<BillItem> items = bill.getItems();
        for (BillItem item : items) {
            productRepository.restoreStock(item.getProductId(), item.getQuantity());
        }

        // Mark payment status as CANCELLED
        billRepository.updateStatus(billId, "CANCELLED");
        bill.setPaymentStatus("CANCELLED");

        return bill;
    }

    private String generateUniqueBillNumber() {
        LocalDate today = LocalDate.now();
        String dateStr = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long seq = billRepository.getNextBillSequence(today);
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return String.format("BILL-%s-%03d-%s", dateStr, seq, randomSuffix);
    }
}
