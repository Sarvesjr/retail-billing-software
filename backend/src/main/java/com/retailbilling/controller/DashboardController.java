package com.retailbilling.controller;

import com.retailbilling.dto.ApiResponse;
import com.retailbilling.model.DashboardSummary;
import com.retailbilling.model.Product;
import com.retailbilling.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummary>> getSummary() {
        DashboardSummary summary = dashboardService.getSummary();
        return ResponseEntity.ok(ApiResponse.ok("Dashboard summary fetched", summary));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<Product>>> getLowStockProducts(@RequestParam(defaultValue = "10") int limit) {
        List<Product> list = dashboardService.getLowStockProducts(limit);
        return ResponseEntity.ok(ApiResponse.ok("Low stock products", list));
    }

    @GetMapping("/store-info")
    public ResponseEntity<ApiResponse<Map<String, String>>> getStoreInfo() {
        Map<String, String> info = dashboardService.getStoreInfo();
        return ResponseEntity.ok(ApiResponse.ok("Store information", info));
    }
}
