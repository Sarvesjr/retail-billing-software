package com.retailbilling.service;

import com.retailbilling.config.StoreConfig;
import com.retailbilling.model.DashboardSummary;
import com.retailbilling.model.Product;
import com.retailbilling.repository.BillRepository;
import com.retailbilling.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final ProductRepository productRepository;
    private final BillRepository billRepository;
    private final StoreConfig storeConfig;

    public DashboardService(ProductRepository productRepository, BillRepository billRepository, StoreConfig storeConfig) {
        this.productRepository = productRepository;
        this.billRepository = billRepository;
        this.storeConfig = storeConfig;
    }

    public DashboardSummary getSummary() {
        DashboardSummary summary = new DashboardSummary();
        summary.setTotalProducts(productRepository.countTotal());
        summary.setActiveProducts(productRepository.countActive());
        summary.setTotalBills(billRepository.countTotalBills());
        summary.setTodaySales(billRepository.getTodaySales());
        summary.setTotalSales(billRepository.getTotalSales());
        summary.setLowStockCount(productRepository.countLowStock());
        return summary;
    }

    public List<Product> getLowStockProducts(int limit) {
        return productRepository.findLowStockProducts(limit > 0 ? limit : 10);
    }

    public Map<String, String> getStoreInfo() {
        Map<String, String> info = new HashMap<>();
        info.put("name", storeConfig.getName());
        info.put("address", storeConfig.getAddress());
        info.put("phone", storeConfig.getPhone());
        info.put("gstin", storeConfig.getGstin());
        info.put("taxMode", storeConfig.getTaxMode());
        return info;
    }
}
