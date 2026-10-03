# ==============================================================================
# HYDROWELL - Production Docker Image (PHP 8.2 + Apache + MySQL Driver)
# ==============================================================================
FROM php:8.2-apache

# Install MySQL and PDO extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache modules (rewrite, headers)
RUN a2enmod rewrite headers

# Set ServerName to suppress Apache warning
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Copy application files
WORKDIR /var/www/html
COPY . /var/www/html/

# Configure permissions for uploads directory
RUN mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    chmod -R 777 /var/www/html/uploads

# Expose standard web port
EXPOSE 80

CMD ["apache2-foreground"]
