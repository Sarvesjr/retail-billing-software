package com.retailbilling.service;

import com.retailbilling.exception.BadRequestException;
import com.retailbilling.exception.ResourceNotFoundException;
import com.retailbilling.model.Product;
import com.retailbilling.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    // Allowed GST rates according to the database CHECK constraint: (0, 0.25, 3, 5, 12, 18, 28, 40)
    private static final Set<BigDecimal> VALID_GST_RATES = new HashSet<>(Arrays.asList(
            new BigDecimal("0"),
            new BigDecimal("0.00"),
            new BigDecimal("0.25"),
            new BigDecimal("3"),
            new BigDecimal("3.00"),
            new BigDecimal("5"),
            new BigDecimal("5.00"),
            new BigDecimal("12"),
            new BigDecimal("12.00"),
            new BigDecimal("18"),
            new BigDecimal("18.00"),
            new BigDecimal("28"),
            new BigDecimal("28.00"),
            new BigDecimal("40"),
            new BigDecimal("40.00")
    ));

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> getAllProducts(String search, String category, Boolean activeOnly, String sortBy, String sortOrder) {
        return productRepository.findAll(search, category, activeOnly, sortBy, sortOrder);
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
    }

    public List<Product> searchProducts(String query) {
        return productRepository.findAll(query, null, true, "product_name", "ASC");
    }

    public List<String> getAllCategories() {
        return productRepository.findAllCategories();
    }

    @Transactional
    public Product createProduct(Product product) {
        validateProduct(product, null);
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existing = getProductById(id);
        validateProduct(updatedProduct, id);

        updatedProduct.setProductId(existing.getProductId());
        productRepository.update(updatedProduct);
        return getProductById(id);
    }

    @Transactional
    public Product updateStock(Long id, BigDecimal newStock) {
        Product product = getProductById(id);
        if (newStock == null || newStock.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Stock quantity cannot be negative.");
        }
        productRepository.updateStock(id, newStock);
        product.setStockQuantity(newStock);
        return product;
    }

    @Transactional
    public Product updateStatus(Long id, boolean active) {
        Product product = getProductById(id);
        productRepository.updateStatus(id, active);
        product.setActive(active);
        return product;
    }

    private void validateProduct(Product product, Long currentProductId) {
        if (product.getProductName() == null || product.getProductName().trim().isEmpty()) {
            throw new BadRequestException("Product name is required.");
        }
        if (product.getSku() == null || product.getSku().trim().isEmpty()) {
            throw new BadRequestException("Product SKU is required.");
        }
        if (productRepository.existsBySku(product.getSku().trim(), currentProductId)) {
            throw new BadRequestException("A product with SKU '" + product.getSku() + "' already exists.");
        }
        if (product.getBarcode() != null && !product.getBarcode().trim().isEmpty()) {
            if (productRepository.existsByBarcode(product.getBarcode().trim(), currentProductId)) {
                throw new BadRequestException("A product with barcode '" + product.getBarcode() + "' already exists.");
            }
        }
        if (product.getSellingPrice() == null || product.getSellingPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Selling price must be non-negative.");
        }
        if (product.getMrp() == null || product.getMrp().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("MRP must be non-negative.");
        }
        if (product.getGstRate() != null && !VALID_GST_RATES.contains(product.getGstRate())) {
            throw new BadRequestException("Invalid GST rate: " + product.getGstRate() + "%. Allowed rates are: 0, 0.25, 3, 5, 12, 18, 28, 40.");
        }
    }
}
