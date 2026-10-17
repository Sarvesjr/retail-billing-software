package com.retailbilling.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StoreConfig {

    @Value("${store.name:SuperMart Retail Store}")
    private String name;

    @Value("${store.tax-mode:INTRA_STATE}")
    private String taxMode;

    public String getName() {
        return name;
    }

    public String getTaxMode() {
        return taxMode;
    }
}
