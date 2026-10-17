package com.retailbilling.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class StockUpdateRequest {

    @NotNull(message = "Stock quantity cannot be null")
    @DecimalMin(value = "0.0", message = "Stock quantity cannot be negative")
    private BigDecimal stockQuantity;

    public StockUpdateRequest() {
    }

    public StockUpdateRequest(BigDecimal stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public BigDecimal getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(BigDecimal stockQuantity) {
        this.stockQuantity = stockQuantity;
    }
}
