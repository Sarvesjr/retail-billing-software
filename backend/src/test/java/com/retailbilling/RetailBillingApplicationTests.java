package com.retailbilling;

import com.retailbilling.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class RetailBillingApplicationTests {

    @Autowired
    private ProductRepository productRepository;

    @Test
    void contextLoadsAndConnectsToDatabase() {
        long count = productRepository.countTotal();
        System.out.println(">>> Verified existing products count in MySQL: " + count);
        assertTrue(count >= 50, "Should have at least 50 products in retail_billing_db");
    }
}
