package com.retailbilling.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StoreConfig {

    @Value("${store.name:SuperMart Retail Store}")
    private String name;

    @Value("${store.address:Shop 12, Main Market Road, Bangalore, Karnataka - 560001}")
    private String address;

    @Value("${store.phone:+91 98765 43210}")
    private String phone;

    @Value("${store.gstin:29AAAAA0000A1Z5}")
    private String gstin;

    @Value("${store.tax-mode:INTRA_STATE}")
    private String taxMode;

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getPhone() {
        return phone;
    }

    public String getGstin() {
        return gstin;
    }

    public String getTaxMode() {
        return taxMode;
    }
}
