package com.retailbilling.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CreateBillRequest {

    @Pattern(regexp = "CASH|UPI|CARD|OTHER", message = "Payment method must be CASH, UPI, CARD, or OTHER")
    private String paymentMethod;

    private String taxMode; // "INTRA_STATE" or "INTER_STATE"

    private BigDecimal additionalDiscount;

    @NotEmpty(message = "Bill must contain at least one product item")
    @Valid
    private List<BillItemRequest> items = new ArrayList<>();

    public CreateBillRequest() {
        this.paymentMethod = "CASH";
        this.taxMode = "INTRA_STATE";
        this.additionalDiscount = BigDecimal.ZERO;
    }

    public String getPaymentMethod() {
        return paymentMethod != null ? paymentMethod : "CASH";
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTaxMode() {
        return taxMode != null ? taxMode : "INTRA_STATE";
    }

    public void setTaxMode(String taxMode) {
        this.taxMode = taxMode;
    }

    public BigDecimal getAdditionalDiscount() {
        return additionalDiscount != null ? additionalDiscount : BigDecimal.ZERO;
    }

    public void setAdditionalDiscount(BigDecimal additionalDiscount) {
        this.additionalDiscount = additionalDiscount;
    }

    public List<BillItemRequest> getItems() {
        return items;
    }

    public void setItems(List<BillItemRequest> items) {
        this.items = items;
    }
}
