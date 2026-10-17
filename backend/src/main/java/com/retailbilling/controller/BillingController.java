package com.retailbilling.controller;

import com.retailbilling.dto.ApiResponse;
import com.retailbilling.dto.CreateBillRequest;
import com.retailbilling.model.Bill;
import com.retailbilling.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bills")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Bill>> createBill(@Valid @RequestBody CreateBillRequest request) {
        Bill savedBill = billingService.createBill(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Bill generated successfully", savedBill));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Bill>>> getAllBills(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status) {
        List<Bill> bills = billingService.getAllBills(search, startDate, endDate, status);
        return ResponseEntity.ok(ApiResponse.ok("Bills retrieved successfully", bills));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Bill>> getBillById(@PathVariable Long id) {
        Bill bill = billingService.getBillById(id);
        return ResponseEntity.ok(ApiResponse.ok("Bill found", bill));
    }

    @GetMapping("/number/{billNumber}")
    public ResponseEntity<ApiResponse<Bill>> getBillByNumber(@PathVariable String billNumber) {
        Bill bill = billingService.getBillByNumber(billNumber);
        return ResponseEntity.ok(ApiResponse.ok("Bill found", bill));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Bill>> cancelBill(@PathVariable Long id) {
        Bill cancelledBill = billingService.cancelBill(id);
        return ResponseEntity.ok(ApiResponse.ok("Bill cancelled and stock restored successfully", cancelledBill));
    }
}
