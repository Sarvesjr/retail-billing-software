package com.retailbilling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class RetailBillingApplication {

    public static void main(String[] args) {
        SpringApplication.run(RetailBillingApplication.class, args);
        System.out.println("==================================================");
        System.out.println(" Retail Billing System Backend Started on port 8080");
        System.out.println(" Connected to MySQL database: retail_billing_db");
        System.out.println("==================================================");
    }
}
