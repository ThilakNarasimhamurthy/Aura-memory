#!/usr/bin/env python3
"""
Generate and import synthetic data to MongoDB.
- Structured data → Regular MongoDB collections (customers, products, transactions, orders, campaigns)
- Searchable text → RAG chunks collection (for vector search)
"""

import json
import os
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Try to import Faker, use fallback if not available
try:
    from faker import Faker
    fake = Faker()
    FAKER_AVAILABLE = True
except ImportError:
    FAKER_AVAILABLE = False
    print("⚠️  Faker not installed. Using fallback data generation.")
    print("   Install with: pip install faker")

# Data configuration
NUM_CUSTOMERS = 500
NUM_PRODUCTS = 200
NUM_TRANSACTIONS = 2000
NUM_ORDERS = 1500
NUM_CAMPAIGNS = 50
NUM_FAQS = 100
NUM_FEEDBACK = 300

# Customer segments
CUSTOMER_SEGMENTS = ["Premium", "Regular", "Casual", "VIP"]
PRODUCT_CATEGORIES = ["Espresso", "Latte", "Cappuccino", "Iced Coffee", "Tea", "Pastry", "Sandwich"]
PAYMENT_METHODS = ["Credit Card", "Debit Card", "Cash", "Mobile Payment"]
CAMPAIGN_TYPES = ["Discount", "Buy One Get One", "Loyalty Points", "Seasonal"]
CAMPAIGN_STATUSES = ["active", "completed", "scheduled"]


def get_fake_name() -> tuple[str, str]:
    """Get fake name, with fallback if Faker is not available."""
    if FAKER_AVAILABLE:
        return fake.first_name(), fake.last_name()
    first_names = ["John", "Jane", "Bob", "Alice", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    return random.choice(first_names), random.choice(last_names)

def get_fake_email(first_name: str, last_name: str) -> str:
    """Get fake email, with fallback if Faker is not available."""
    if FAKER_AVAILABLE:
        return fake.email()
    domains = ["email.com", "example.com", "test.com", "mail.com"]
    return f"{first_name.lower()}.{last_name.lower()}@{random.choice(domains)}"

def get_fake_phone() -> str:
    """Get fake phone, with fallback if Faker is not available."""
    if FAKER_AVAILABLE:
        return fake.phone_number()
    return f"+1-555-{random.randint(1000, 9999)}"

def get_fake_company() -> str:
    """Get fake company, with fallback if Faker is not available."""
    if FAKER_AVAILABLE:
        return fake.company()
    companies = ["Coffee Beans Co.", "Premium Roasters", "Bean Supply Inc.", "Roast Masters"]
    return random.choice(companies)

def generate_customers(count: int) -> list[dict[str, Any]]:
    """Generate synthetic customer data with all fields needed for frontend."""
    customers = []
    for i in range(1, count + 1):
        customer_id = f"C{i:04d}"
        segment = random.choice(CUSTOMER_SEGMENTS)
        loyalty_member = random.choice([True, False])
        total_purchases = random.randint(5, 100)
        avg_order_value = round(random.uniform(15.0, 50.0), 2)
        total_spent = round(total_purchases * avg_order_value, 2)
        lifetime_value = round(total_spent * random.uniform(1.1, 1.5), 2)  # LTV is typically higher than total spent
        
        first_name, last_name = get_fake_name()
        phone_number = get_fake_phone()
        
        # Calculate churn risk based on customer behavior
        days_since_last_purchase = random.randint(0, 90)
        if days_since_last_purchase > 60:
            churn_risk_score = round(random.uniform(0.6, 0.9), 2)  # High churn risk
        elif days_since_last_purchase > 30:
            churn_risk_score = round(random.uniform(0.3, 0.6), 2)  # Medium churn risk
        else:
            churn_risk_score = round(random.uniform(0.1, 0.3), 2)  # Low churn risk
        
        # Generate campaign engagement metrics
        responded_to_campaigns = random.randint(0, min(total_purchases, 20))
        converted_campaigns = random.randint(0, int(responded_to_campaigns * 0.3))  # 30% conversion rate
        
        # Email engagement metrics
        email_open_rate = round(random.uniform(15.0, 45.0), 1)  # 15-45% open rate
        email_click_rate = round(random.uniform(2.0, 8.0), 1)   # 2-8% click rate
        
        # SMS response rate
        sms_response_rate = round(random.uniform(10.0, 25.0), 1)  # 10-25% SMS response
        
        # Satisfaction score
        satisfaction_score = round(random.uniform(3.5, 5.0), 1)  # 3.5-5.0 out of 5
        
        customers.append({
            "customer_id": customer_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": get_fake_email(first_name, last_name),
            "phone": phone_number,
            "customer_segment": segment,
            "loyalty_member": loyalty_member,
            "loyalty_points": random.randint(0, 5000) if loyalty_member else 0,
            "total_purchases": total_purchases,
            "total_spent": total_spent,
            "avg_order_value": avg_order_value,
            "lifetime_value": lifetime_value,
            "churn_risk_score": churn_risk_score,
            "first_purchase_date": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
            "last_purchase_date": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            "days_since_last_purchase": days_since_last_purchase,
            "preferred_category": random.choice(PRODUCT_CATEGORIES),  # Will be updated based on orders
            "favorite_product_category": random.choice(PRODUCT_CATEGORIES),  # Will be updated based on orders
            "preferred_contact_method": phone_number,  # Phone number as preferred contact method
            "visit_frequency": random.choice(["Daily", "3-4 times per week", "Weekly", "Monthly", "Occasional"]),
            "preferred_time": random.choice(["Morning", "Afternoon", "Evening", "Anytime"]),
            # Campaign engagement metrics
            "responded_to_campaigns": responded_to_campaigns,
            "clicked_campaigns": responded_to_campaigns,  # Assume all responders clicked
            "converted_campaigns": converted_campaigns,
            # Email metrics
            "email_open_rate": email_open_rate,
            "email_click_rate": email_click_rate,
            # SMS metrics
            "sms_response_rate": sms_response_rate,
            # Social media metrics
            "social_shares": random.randint(0, 10),
            "video_completion_rate": round(random.uniform(40.0, 80.0), 1),
            "app_downloads": random.randint(0, 3),
            "store_visits": random.randint(total_purchases, total_purchases + 20),
            # Other metrics
            "satisfaction_score": satisfaction_score,
            "referrals_made": random.randint(0, 5),
            "repeat_purchase_rate": round(random.uniform(40.0, 80.0), 1),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
    return customers


def generate_products(count: int) -> list[dict[str, Any]]:
    """Generate synthetic product data."""
    products = []
    product_names = {
        "Espresso": ["Single Espresso", "Double Espresso", "Americano", "Macchiato"],
        "Latte": ["Vanilla Latte", "Caramel Latte", "Hazelnut Latte", "Classic Latte"],
        "Cappuccino": ["Regular Cappuccino", "Vanilla Cappuccino", "Chocolate Cappuccino"],
        "Iced Coffee": ["Iced Americano", "Iced Latte", "Cold Brew", "Iced Espresso"],
        "Tea": ["Green Tea", "Black Tea", "Herbal Tea", "Chai Latte"],
        "Pastry": ["Croissant", "Muffin", "Bagel", "Donut"],
        "Sandwich": ["Breakfast Sandwich", "Turkey Sandwich", "Veggie Sandwich"]
    }
    
    for i in range(1, count + 1):
        category = random.choice(PRODUCT_CATEGORIES)
        product_name = random.choice(product_names.get(category, ["Product"]))
        price = round(random.uniform(2.50, 12.00), 2)
        cost = round(price * random.uniform(0.2, 0.4), 2)
        profit_margin = round(((price - cost) / price) * 100, 1)
        
        products.append({
            "product_id": f"P{i:04d}",
            "name": product_name,
            "category": category,
            "subcategory": random.choice(["Hot", "Cold", "Food", "Beverage"]),
            "price": price,
            "cost": cost,
            "profit_margin": profit_margin,
            "description": f"{product_name} - {category}",
            "in_stock": random.choice([True, True, True, False]),  # 75% in stock
            "stock_quantity": random.randint(0, 1000) if random.choice([True, True, True, False]) else 0,
            "supplier": get_fake_company(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
    return products


def generate_transactions(count: int, customers: list, products: list) -> list[dict[str, Any]]:
    """Generate synthetic transaction data."""
    transactions = []
    for i in range(1, count + 1):
        customer = random.choice(customers)
        product = random.choice(products)
        quantity = random.randint(1, 5)
        unit_price = product["price"]
        total_amount = round(quantity * unit_price, 2)
        
        transactions.append({
            "transaction_id": f"T{i:06d}",
            "customer_id": customer["customer_id"],
            "product_id": product["product_id"],
            "quantity": quantity,
            "unit_price": unit_price,
            "total_amount": total_amount,
            "transaction_date": (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat(),
            "payment_method": random.choice(PAYMENT_METHODS),
            "location": random.choice(["Downtown Store", "Mall Location", "Airport Store"]),
            "campaign_id": f"CAM{random.randint(1, NUM_CAMPAIGNS):03d}" if random.random() < 0.3 else None,
            "created_at": datetime.now().isoformat()
        })
    return transactions


def generate_orders(count: int, customers: list, products: list) -> list[dict[str, Any]]:
    """Generate synthetic order data."""
    orders = []
    for i in range(1, count + 1):
        customer = random.choice(customers)
        num_items = random.randint(1, 5)
        items = []
        subtotal = 0.0
        
        for _ in range(num_items):
            product = random.choice(products)
            quantity = random.randint(1, 3)
            unit_price = product["price"]
            item_total = round(quantity * unit_price, 2)
            subtotal += item_total
            
            items.append({
                "product_id": product["product_id"],
                "product_name": product["name"],
                "quantity": quantity,
                "unit_price": unit_price,
                "total": item_total
            })
        
        tax = round(subtotal * 0.08, 2)
        total = round(subtotal + tax, 2)
        
        orders.append({
            "order_id": f"O{i:06d}",
            "customer_id": customer["customer_id"],
            "order_date": (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat(),
            "items": items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "status": random.choice(["completed", "pending", "cancelled"]),
            "payment_method": random.choice(PAYMENT_METHODS),
            "location": random.choice(["Downtown Store", "Mall Location", "Airport Store"]),
            "created_at": datetime.now().isoformat()
        })
    return orders


def generate_campaigns(count: int) -> list[dict[str, Any]]:
    """Generate synthetic campaign data with all fields needed for frontend."""
    campaigns = []
    for i in range(1, count + 1):
        campaign_type = random.choice(CAMPAIGN_TYPES)
        start_date = datetime.now() - timedelta(days=random.randint(0, 60))
        end_date = start_date + timedelta(days=random.randint(7, 30))
        status = random.choice(CAMPAIGN_STATUSES)
        target_segment = random.choice(CUSTOMER_SEGMENTS)
        
        # Generate campaign performance metrics
        # Response rate: percentage of target segment that responded
        response_rate = round(random.uniform(15.0, 45.0), 1)
        
        # Conversion rate: percentage of responders who converted
        conversion_rate = round(response_rate * random.uniform(0.25, 0.40), 1)  # 25-40% of responders convert
        
        # Email metrics
        open_rate = round(min(100, response_rate * random.uniform(1.2, 1.8)), 1)  # Open rate higher than response
        click_rate = round(open_rate * random.uniform(0.15, 0.25), 1)  # 15-25% of opens result in clicks
        
        # Campaign spend and revenue
        total_spend = round(random.uniform(500.0, 5000.0), 2)
        # Revenue is typically 3-5x spend for successful campaigns
        total_revenue = round(total_spend * random.uniform(2.5, 5.0), 2)
        
        # ROI calculation
        roi = round(((total_revenue - total_spend) / total_spend) * 100, 1)
        
        campaigns.append({
            "campaign_id": f"CAM{i:03d}",
            "name": f"{campaign_type} Campaign {i}",
            "type": campaign_type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "discount_percentage": random.randint(10, 30) if campaign_type == "Discount" else None,
            "target_segment": target_segment,
            "status": status,
            # Campaign performance metrics
            "response_rate": response_rate,
            "conversion_rate": conversion_rate,
            "open_rate": open_rate,
            "click_rate": click_rate,
            # Financial metrics
            "total_spend": total_spend,
            "total_revenue": total_revenue,
            "roi": roi,
            # Channel (for frontend display)
            "channel": random.choice(["Email", "SMS", "Social Media", "In-App"]),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
    return campaigns


def generate_customer_profile_text(customer: dict) -> str:
    """Generate searchable text description for customer profile."""
    parts = []
    parts.append(f"{customer['first_name']} {customer['last_name']} is a {customer['customer_segment']} customer")
    
    if customer['loyalty_member']:
        parts.append(f"who is a loyalty member with {customer['loyalty_points']} loyalty points")
    
    parts.append(f"who prefers {customer['preferred_category']}")
    parts.append(f"and visits {customer['visit_frequency'].lower()}")
    parts.append(f"typically in the {customer['preferred_time'].lower()}")
    
    parts.append(f"He has made {customer['total_purchases']} purchases")
    parts.append(f"and spent ${customer['total_spent']:.2f} in total")
    parts.append(f"with an average order value of ${customer['avg_order_value']:.2f}")
    
    if customer['loyalty_points'] > 2000:
        parts.append("He is a highly engaged customer")
    elif customer['total_spent'] > 1000:
        parts.append("He is a valuable customer")
    
    return ". ".join(parts) + "."


def generate_product_description_text(product: dict) -> str:
    """Generate searchable text description for product."""
    parts = []
    parts.append(f"{product['name']} is a {product['category']} product")
    parts.append(f"priced at ${product['price']:.2f}")
    
    if product['category'] == "Espresso":
        parts.append("with a rich, bold flavor and notes of chocolate and caramel")
        parts.append("Perfect for coffee enthusiasts who enjoy a strong, aromatic coffee experience")
    elif product['category'] == "Latte":
        parts.append("with a smooth, creamy texture and sweet flavor")
        parts.append("Ideal for those who prefer a milder coffee taste")
    elif product['category'] == "Iced Coffee":
        parts.append("refreshing and perfect for hot days")
        parts.append("Made with premium coffee beans and served over ice")
    elif product['category'] == "Pastry":
        parts.append("freshly baked daily")
        parts.append("Perfect pairing with coffee or tea")
    
    parts.append(f"It has a profit margin of {product['profit_margin']}%")
    
    if product['in_stock']:
        parts.append(f"and is currently in stock with {product['stock_quantity']} units available")
    else:
        parts.append("and is currently out of stock")
    
    return ". ".join(parts) + "."


def generate_faq_text() -> str:
    """Generate FAQ text."""
    faqs = [
        "How do I redeem my loyalty points? You can redeem your loyalty points at any of our locations by simply telling the barista at checkout. Each point is worth $0.01, so 100 points equals $1.00 off your purchase.",
        "What are your store hours? We are open Monday through Friday from 6:00 AM to 9:00 PM, and weekends from 7:00 AM to 10:00 PM.",
        "Do you offer vegan options? Yes, we offer a variety of vegan options including plant-based milk alternatives, vegan pastries, and vegan sandwiches.",
        "How can I track my order? You can track your order through our mobile app or by asking at the counter. Orders are typically ready within 5-10 minutes.",
        "Do you offer catering services? Yes, we offer catering services for events and corporate meetings. Please contact us at least 24 hours in advance.",
        "What payment methods do you accept? We accept credit cards, debit cards, cash, and mobile payment methods like Apple Pay and Google Pay.",
        "Can I customize my drink? Yes, you can customize your drink with various milk options, syrups, and add-ons. Just let the barista know your preferences.",
        "Do you have WiFi? Yes, we offer free WiFi for all customers. The password is available at the counter.",
        "Are your coffee beans ethically sourced? Yes, we source our coffee beans from ethically certified farms that support fair trade practices.",
        "Can I place an order online? Yes, you can place an order through our mobile app or website for pickup or delivery."
    ]
    return random.choice(faqs)


def generate_feedback_text(customer: dict, product: dict) -> str:
    """Generate customer feedback text."""
    feedback_templates = [
        f"Great {product['name']}! The {product['category']} was perfect, and the staff was very friendly. I'll definitely be back.",
        f"Love the {product['name']}! The quality is excellent and the service is always top-notch. Highly recommend!",
        f"The {product['name']} was good, but it could be better. The {product['category']} was a bit too strong for my taste.",
        f"Amazing experience! The {product['name']} exceeded my expectations. The atmosphere is cozy and perfect for working.",
        f"Really enjoyed the {product['name']}! The {product['category']} had great flavor and the staff was helpful and courteous."
    ]
    return random.choice(feedback_templates)


def analyze_customer_favorite_products(customers: list, orders: list, transactions: list, products: list) -> list:
    """
    Analyze favorite products for each customer based on frequent orders.
    Updates customer's preferred_category based on their order history.
    """
    print(f"\n🔍 Analyzing favorite products from orders and transactions...")
    
    # Create product lookup by ID
    product_lookup = {p["product_id"]: p for p in products}
    
    # Create customer lookup by ID
    customer_lookup = {c["customer_id"]: c for c in customers}
    
    # Count product categories per customer from orders
    customer_category_count = {}
    
    # Analyze orders
    for order in orders:
        customer_id = order.get("customer_id")
        if not customer_id:
            continue
            
        items = order.get("items", [])
        for item in items:
            product_id = item.get("product_id")
            quantity = item.get("quantity", 1)
            
            if product_id and product_id in product_lookup:
                product = product_lookup[product_id]
                category = product.get("category", "Other")
                
                if customer_id not in customer_category_count:
                    customer_category_count[customer_id] = {}
                
                customer_category_count[customer_id][category] = customer_category_count[customer_id].get(category, 0) + quantity
    
    # Analyze transactions
    for transaction in transactions:
        customer_id = transaction.get("customer_id")
        product_id = transaction.get("product_id")
        quantity = transaction.get("quantity", 1)
        
        if customer_id and product_id and product_id in product_lookup:
            product = product_lookup[product_id]
            category = product.get("category", "Other")
            
            if customer_id not in customer_category_count:
                customer_category_count[customer_id] = {}
            
            customer_category_count[customer_id][category] = customer_category_count[customer_id].get(category, 0) + quantity
    
        # Update customers with favorite categories and ensure all required fields
        updated_count = 0
        for customer in customers:
            customer_id = customer["customer_id"]
            
            # Ensure preferred_contact_method is set to phone number
            if "phone" in customer:
                customer["preferred_contact_method"] = customer["phone"]
            elif "preferred_contact_method" not in customer:
                customer["preferred_contact_method"] = get_fake_phone()
                customer["phone"] = customer["preferred_contact_method"]
            
            # Update favorite category based on order analysis
            if customer_id in customer_category_count:
                categories = customer_category_count[customer_id]
                if categories:
                    # Get category with highest count
                    favorite_category = max(categories.items(), key=lambda x: x[1])[0]
                    customer["preferred_category"] = favorite_category
                    customer["favorite_product_category"] = favorite_category
                    updated_count += 1
                else:
                    # Fallback to existing or random
                    if "favorite_product_category" not in customer:
                        customer["favorite_product_category"] = customer.get("preferred_category", random.choice(PRODUCT_CATEGORIES))
            else:
                # Ensure favorite_product_category exists
                if "favorite_product_category" not in customer:
                    customer["favorite_product_category"] = customer.get("preferred_category", random.choice(PRODUCT_CATEGORIES))
            
            # Ensure all required numeric fields are present and valid
            if "churn_risk_score" not in customer or customer["churn_risk_score"] is None:
                customer["churn_risk_score"] = round(random.uniform(0.1, 0.7), 2)
            
            if "lifetime_value" not in customer or customer["lifetime_value"] is None:
                customer["lifetime_value"] = customer.get("total_spent", 0) * random.uniform(1.1, 1.5)
            
            # Ensure campaign engagement metrics exist
            if "responded_to_campaigns" not in customer:
                customer["responded_to_campaigns"] = random.randint(0, min(customer.get("total_purchases", 0), 20))
            
            if "converted_campaigns" not in customer:
                customer["converted_campaigns"] = random.randint(0, int(customer.get("responded_to_campaigns", 0) * 0.3))
            
            # Ensure email metrics exist
            if "email_open_rate" not in customer:
                customer["email_open_rate"] = round(random.uniform(15.0, 45.0), 1)
            
            if "email_click_rate" not in customer:
                customer["email_click_rate"] = round(random.uniform(2.0, 8.0), 1)
            
            # Ensure other metrics exist
            if "satisfaction_score" not in customer:
                customer["satisfaction_score"] = round(random.uniform(3.5, 5.0), 1)
            
            if "sms_response_rate" not in customer:
                customer["sms_response_rate"] = round(random.uniform(10.0, 25.0), 1)
        
        print(f"   ✅ Updated {updated_count} customers with favorite products from order analysis")
        print(f"   ✅ Ensured all customers have required fields for frontend display")
        return customers


def import_structured_data_to_mongodb(data: dict[str, list]):
    """Import structured data directly to MongoDB collections."""
    from pymongo import MongoClient
    
    # Get MongoDB connection
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_database = os.getenv("MONGODB_DATABASE", "ell_db")
    
    print(f"\n📊 Importing structured data to MongoDB...")
    print(f"   Database: {mongodb_database}")
    print(f"   URI: {mongodb_uri}")
    
    try:
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        # Test connection
        client.server_info()
        
        db = client[mongodb_database]
        
        # Import each collection
        collections = {
            "customers": data["customers"],
            "products": data["products"],
            "transactions": data["transactions"],
            "orders": data["orders"],
            "campaigns": data["campaigns"]
        }
        
        for collection_name, documents in collections.items():
            collection = db[collection_name]
            
            # Clear existing data (optional - uncomment to clear before inserting)
            # collection.delete_many({})
            
            # Insert documents in batches for better performance
            batch_size = 1000
            total_inserted = 0
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                result = collection.insert_many(batch)
                total_inserted += len(result.inserted_ids)
            
            print(f"   ✅ {collection_name}: Inserted {total_inserted} documents")
        
        client.close()
        print(f"   ✅ Structured data import complete!\n")
    except Exception as e:
        print(f"   ❌ Error importing structured data: {e}")
        print(f"   Please check MongoDB connection and try again.")
        raise


def import_rag_chunks_via_api(customer_profiles: list, product_descriptions: list, faqs: list, feedbacks: list, campaign_descriptions: list):
    """Import RAG chunks via API (for vector search)."""
    print(f"\n🔍 Importing RAG chunks via API for vector search...")
    print(f"   API URL: {API_BASE_URL}")
    
    # Import customer profiles
    if customer_profiles:
        print(f"   Importing {len(customer_profiles)} customer profiles...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/langchain-rag/documents",
                json={
                    "texts": [item["text"] for item in customer_profiles],
                    "source": "customer_profiles",
                    "metadatas": [item["metadata"] for item in customer_profiles]
                },
                timeout=300
            )
            if response.status_code == 200:
                print(f"   ✅ Customer profiles: Imported successfully")
            else:
                print(f"   ⚠️  Customer profiles: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Customer profiles: Error - {e}")
    
    # Import product descriptions
    if product_descriptions:
        print(f"   Importing {len(product_descriptions)} product descriptions...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/langchain-rag/documents",
                json={
                    "texts": [item["text"] for item in product_descriptions],
                    "source": "product_descriptions",
                    "metadatas": [item["metadata"] for item in product_descriptions]
                },
                timeout=300
            )
            if response.status_code == 200:
                print(f"   ✅ Product descriptions: Imported successfully")
            else:
                print(f"   ⚠️  Product descriptions: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Product descriptions: Error - {e}")
    
    # Import FAQs
    if faqs:
        print(f"   Importing {len(faqs)} FAQs...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/langchain-rag/documents",
                json={
                    "texts": [item["text"] for item in faqs],
                    "source": "faq_documents",
                    "metadatas": [item["metadata"] for item in faqs]
                },
                timeout=300
            )
            if response.status_code == 200:
                print(f"   ✅ FAQs: Imported successfully")
            else:
                print(f"   ⚠️  FAQs: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ FAQs: Error - {e}")
    
    # Import customer feedback
    if feedbacks:
        print(f"   Importing {len(feedbacks)} customer feedback...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/langchain-rag/documents",
                json={
                    "texts": [item["text"] for item in feedbacks],
                    "source": "customer_feedback",
                    "metadatas": [item["metadata"] for item in feedbacks]
                },
                timeout=300
            )
            if response.status_code == 200:
                print(f"   ✅ Customer feedback: Imported successfully")
            else:
                print(f"   ⚠️  Customer feedback: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Customer feedback: Error - {e}")
    
    # Import campaign descriptions
    if campaign_descriptions:
        print(f"   Importing {len(campaign_descriptions)} campaign descriptions...")
        try:
            response = requests.post(
                f"{API_BASE_URL}/langchain-rag/documents",
                json={
                    "texts": [item["text"] for item in campaign_descriptions],
                    "source": "campaign_descriptions",
                    "metadatas": [item["metadata"] for item in campaign_descriptions]
                },
                timeout=300
            )
            if response.status_code == 200:
                print(f"   ✅ Campaign descriptions: Imported successfully")
            else:
                print(f"   ⚠️  Campaign descriptions: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Campaign descriptions: Error - {e}")
    
    print(f"   ✅ RAG chunks import complete!\n")


def main():
    """Main function to generate and import all data."""
    print("=" * 80)
    print("Synthetic Data Generation and Import")
    print("=" * 80)
    
    # Generate structured data
    print("\n1. Generating structured data...")
    customers = generate_customers(NUM_CUSTOMERS)
    products = generate_products(NUM_PRODUCTS)
    transactions = generate_transactions(NUM_TRANSACTIONS, customers, products)
    orders = generate_orders(NUM_ORDERS, customers, products)
    campaigns = generate_campaigns(NUM_CAMPAIGNS)
    
    print(f"   ✅ Generated {len(customers)} customers")
    print(f"   ✅ Generated {len(products)} products")
    print(f"   ✅ Generated {len(transactions)} transactions")
    print(f"   ✅ Generated {len(orders)} orders")
    print(f"   ✅ Generated {len(campaigns)} campaigns")
    
    # Analyze favorite products from orders and update customers
    customers = analyze_customer_favorite_products(customers, orders, transactions, products)
    
    # Import structured data to MongoDB
    structured_data = {
        "customers": customers,
        "products": products,
        "transactions": transactions,
        "orders": orders,
        "campaigns": campaigns
    }
    import_structured_data_to_mongodb(structured_data)
    
    # Generate RAG chunks (searchable text)
    print("\n2. Generating RAG chunks for vector search...")
    
    # Customer profiles
    customer_profiles = []
    for customer in customers:
        customer_profiles.append({
            "text": generate_customer_profile_text(customer),
            "metadata": {
                "customer_id": customer["customer_id"],
                "type": "customer_profile",
                "category": "customer_data",
                "title": f"Customer Profile: {customer['first_name']} {customer['last_name']}"
            }
        })
    
    # Product descriptions
    product_descriptions = []
    for product in products:
        product_descriptions.append({
            "text": generate_product_description_text(product),
            "metadata": {
                "product_id": product["product_id"],
                "type": "product_description",
                "category": "product_catalog",
                "title": f"Product: {product['name']}"
            }
        })
    
    # FAQs
    faqs = []
    for i in range(NUM_FAQS):
        faqs.append({
            "text": generate_faq_text(),
            "metadata": {
                "type": "faq",
                "category": "knowledge_base",
                "title": f"FAQ {i+1}",
                "topic": random.choice(["loyalty", "products", "hours", "payment", "orders"])
            }
        })
    
    # Customer feedback
    feedbacks = []
    for i in range(NUM_FEEDBACK):
        customer = random.choice(customers)
        product = random.choice(products)
        feedbacks.append({
            "text": generate_feedback_text(customer, product),
            "metadata": {
                "customer_id": customer["customer_id"],
                "product_id": product["product_id"],
                "type": "customer_feedback",
                "category": "reviews",
                "rating": random.randint(3, 5),
                "date": (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat()
            }
        })
    
    # Campaign descriptions
    campaign_descriptions = []
    for campaign in campaigns:
        campaign_descriptions.append({
            "text": f"{campaign['name']} is a {campaign['type']} campaign targeting {campaign['target_segment']} customers. It runs from {campaign['start_date']} to {campaign['end_date']}. The campaign status is {campaign['status']}.",
            "metadata": {
                "campaign_id": campaign["campaign_id"],
                "type": "campaign_description",
                "category": "marketing",
                "title": campaign["name"]
            }
        })
    
    print(f"   ✅ Generated {len(customer_profiles)} customer profiles")
    print(f"   ✅ Generated {len(product_descriptions)} product descriptions")
    print(f"   ✅ Generated {len(faqs)} FAQs")
    print(f"   ✅ Generated {len(feedbacks)} customer feedback")
    print(f"   ✅ Generated {len(campaign_descriptions)} campaign descriptions")
    
    # Import RAG chunks via API
    import_rag_chunks_via_api(
        customer_profiles,
        product_descriptions,
        faqs,
        feedbacks,
        campaign_descriptions
    )
    
    print("=" * 80)
    print("✅ Data generation and import complete!")
    print("=" * 80)
    print("\n📊 Summary:")
    print(f"   - Structured data: {len(customers)} customers, {len(products)} products, {len(transactions)} transactions, {len(orders)} orders, {len(campaigns)} campaigns")
    print(f"   - RAG chunks: {len(customer_profiles)} profiles, {len(product_descriptions)} descriptions, {len(faqs)} FAQs, {len(feedbacks)} feedback, {len(campaign_descriptions)} campaigns")
    print(f"\n🔍 Vector search is available in the 'chunks' collection")
    print(f"📊 Structured data is available in: customers, products, transactions, orders, campaigns collections")
    print()


if __name__ == "__main__":
    import os
    main()

