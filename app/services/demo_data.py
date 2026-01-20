"""
Demo data generator for testing the analytics dashboard.
Generates realistic sample review data for demonstration purposes.
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any


class DemoDataGenerator:
    """Generates realistic demo data for the sentiment analyzer."""

    POSITIVE_REVIEWS = [
        "Absolutely love this product! The quality exceeded my expectations.",
        "Fast shipping and great customer service. Will buy again!",
        "Perfect fit and amazing quality. Highly recommend!",
        "Best purchase I've made this year. Worth every penny.",
        "The product arrived quickly and works perfectly. Very satisfied!",
        "Excellent quality materials. My family loves it!",
        "Super happy with this purchase. Exactly as described.",
        "Great value for money. The quality is outstanding.",
        "Impressed with how well-made this is. Five stars!",
        "Couldn't be happier! Shipping was fast and product is amazing.",
        "This exceeded all my expectations. Truly a fantastic product.",
        "I've bought many similar products but this one is the best.",
        "Love the attention to detail. Customer service was helpful too.",
        "Purchased as a gift and they absolutely loved it!",
        "The quality speaks for itself. Will definitely order more.",
    ]

    NEUTRAL_REVIEWS = [
        "Product is okay. Does what it's supposed to do.",
        "Decent quality for the price. Nothing special.",
        "It works fine. Shipping took a bit longer than expected.",
        "Average product. Met my basic expectations.",
        "Not bad, not great. Just what I needed.",
        "The product is fine but packaging could be better.",
        "Serves its purpose. Would consider buying again.",
        "Okay product. Instructions could be clearer.",
    ]

    NEGATIVE_REVIEWS = [
        "Disappointed with the quality. Not as described.",
        "Shipping took forever and product arrived damaged.",
        "Poor quality materials. Would not recommend.",
        "Customer service was unhelpful when I had issues.",
        "Product broke after a week. Very disappointed.",
        "Not worth the price. Expected much better quality.",
        "The sizing was completely off. Had to return.",
        "Arrived late and missing parts. Frustrating experience.",
    ]

    PRODUCT_NAMES = [
        "Premium Wireless Earbuds",
        "Organic Cotton T-Shirt",
        "Stainless Steel Water Bottle",
        "LED Desk Lamp",
        "Bamboo Cutting Board",
        "Leather Wallet",
        "Yoga Mat Pro",
        "Ceramic Coffee Mug Set",
        "Phone Stand Holder",
        "Portable Charger 10000mAh",
    ]

    def __init__(self):
        self.products = self._generate_products()

    def _generate_products(self) -> List[Dict[str, Any]]:
        """Generate a list of sample products."""
        return [
            {"id": f"prod_{i}", "title": name}
            for i, name in enumerate(self.PRODUCT_NAMES)
        ]

    def generate_reviews(self, count: int = 500) -> List[Dict[str, Any]]:
        """
        Generate sample reviews with realistic distribution.

        Distribution: ~60% positive, ~25% neutral, ~15% negative
        """
        reviews = []
        end_date = datetime.now()

        for i in range(count):
            # Determine sentiment based on realistic distribution
            rand = random.random()
            if rand < 0.60:
                review_text = random.choice(self.POSITIVE_REVIEWS)
                rating = random.choice([4, 5, 5, 5])  # Weighted toward 5
                sentiment_score = random.uniform(0.5, 0.95)
            elif rand < 0.85:
                review_text = random.choice(self.NEUTRAL_REVIEWS)
                rating = random.choice([3, 3, 4])
                sentiment_score = random.uniform(-0.2, 0.3)
            else:
                review_text = random.choice(self.NEGATIVE_REVIEWS)
                rating = random.choice([1, 2, 2])
                sentiment_score = random.uniform(-0.9, -0.3)

            # Random date within the last 90 days
            random_days = random.randint(0, 90)
            review_date = end_date - timedelta(days=random_days)

            product = random.choice(self.products)

            reviews.append({
                "id": f"review_{i}",
                "text": review_text,
                "title": review_text.split('.')[0][:50],
                "rating": rating,
                "date": review_date.isoformat(),
                "reviewer_name": f"Customer {i}",
                "verified": random.random() > 0.2,
                "product_id": product["id"],
                "product_title": product["title"],
                "score": round(sentiment_score, 2),
            })

        return reviews

    def generate_demo_dashboard(self) -> Dict[str, Any]:
        """Generate complete demo dashboard data matching DashboardResponse type."""
        reviews = self.generate_reviews(500)

        # Calculate sentiment distribution
        positive = sum(1 for r in reviews if r["score"] > 0.2)
        neutral = sum(1 for r in reviews if -0.2 <= r["score"] <= 0.2)
        negative = sum(1 for r in reviews if r["score"] < -0.2)
        total = len(reviews)

        # Calculate average sentiment
        avg_sentiment = sum(r["score"] for r in reviews) / total

        # Generate trends data (last 12 weeks)
        periods = []
        sentiment_values = []
        moving_avg = []
        volume = []

        for i in range(12):
            week_start = datetime.now() - timedelta(weeks=11-i)
            periods.append(week_start.strftime("%Y-%m-%d"))
            sent_val = random.uniform(0.3, 0.6)
            sentiment_values.append(round(sent_val, 2))
            moving_avg.append(round(sent_val + random.uniform(-0.05, 0.05), 2))
            volume.append(random.randint(30, 60))

        # Generate topics
        topics = {
            "keywords": [
                {"keyword": "quality", "score": round(random.uniform(0.1, 0.3), 2)},
                {"keyword": "shipping", "score": round(random.uniform(0.08, 0.2), 2)},
                {"keyword": "price", "score": round(random.uniform(0.07, 0.15), 2)},
                {"keyword": "fast", "score": round(random.uniform(0.06, 0.12), 2)},
                {"keyword": "love", "score": round(random.uniform(0.05, 0.1), 2)},
                {"keyword": "perfect", "score": round(random.uniform(0.04, 0.09), 2)},
                {"keyword": "great", "score": round(random.uniform(0.04, 0.08), 2)},
                {"keyword": "recommend", "score": round(random.uniform(0.03, 0.07), 2)},
            ],
            "bigrams": [
                {"phrase": "great quality", "count": random.randint(40, 80)},
                {"phrase": "fast shipping", "count": random.randint(35, 70)},
                {"phrase": "highly recommend", "count": random.randint(30, 60)},
                {"phrase": "customer service", "count": random.randint(25, 50)},
                {"phrase": "value money", "count": random.randint(20, 45)},
                {"phrase": "exactly described", "count": random.randint(15, 35)},
            ],
            "clusters": [
                {"name": "Product Quality", "words": ["quality", "material", "durable", "well-made"], "document_count": random.randint(150, 200)},
                {"name": "Shipping Experience", "words": ["shipping", "fast", "delivery", "packaging"], "document_count": random.randint(100, 150)},
                {"name": "Customer Service", "words": ["service", "helpful", "response", "support"], "document_count": random.randint(80, 120)},
                {"name": "Value", "words": ["price", "value", "worth", "money"], "document_count": random.randint(90, 130)},
            ],
        }

        # Generate aspects
        aspects = [
            {"aspect": "Quality", "aspect_key": "quality", "avg_sentiment": round(random.uniform(0.5, 0.8), 2), "mentions": random.randint(180, 220), "reviews_with_aspect": random.randint(150, 200), "positive_pct": round(random.uniform(70, 85), 1), "negative_pct": round(random.uniform(8, 15), 1)},
            {"aspect": "Shipping", "aspect_key": "shipping", "avg_sentiment": round(random.uniform(0.4, 0.7), 2), "mentions": random.randint(140, 180), "reviews_with_aspect": random.randint(120, 160), "positive_pct": round(random.uniform(65, 80), 1), "negative_pct": round(random.uniform(10, 20), 1)},
            {"aspect": "Price", "aspect_key": "price", "avg_sentiment": round(random.uniform(0.45, 0.75), 2), "mentions": random.randint(120, 160), "reviews_with_aspect": random.randint(100, 140), "positive_pct": round(random.uniform(68, 82), 1), "negative_pct": round(random.uniform(8, 16), 1)},
            {"aspect": "Customer Service", "aspect_key": "service", "avg_sentiment": round(random.uniform(0.5, 0.8), 2), "mentions": random.randint(100, 140), "reviews_with_aspect": random.randint(80, 120), "positive_pct": round(random.uniform(72, 88), 1), "negative_pct": round(random.uniform(6, 14), 1)},
            {"aspect": "Durability", "aspect_key": "durability", "avg_sentiment": round(random.uniform(0.4, 0.7), 2), "mentions": random.randint(80, 120), "reviews_with_aspect": random.randint(60, 100), "positive_pct": round(random.uniform(60, 78), 1), "negative_pct": round(random.uniform(12, 22), 1)},
        ]

        # Generate pain points
        pain_points = [
            {"aspect": "Shipping", "negative_mentions": random.randint(15, 30), "avg_score": round(random.uniform(-0.6, -0.3), 2), "examples": ["Shipping took forever", "Package was damaged"]},
            {"aspect": "Durability", "negative_mentions": random.randint(10, 25), "avg_score": round(random.uniform(-0.7, -0.4), 2), "examples": ["Product broke after a week", "Not as durable as expected"]},
            {"aspect": "Price", "negative_mentions": random.randint(8, 20), "avg_score": round(random.uniform(-0.5, -0.2), 2), "examples": ["Overpriced for quality", "Not worth the money"]},
        ]

        # Generate key drivers
        key_drivers = [
            {"aspect": "Quality", "avg_sentiment": round(random.uniform(0.6, 0.8), 2), "mention_count": random.randint(180, 220), "impact_score": round(random.uniform(0.7, 0.9), 2), "priority": "maintain"},
            {"aspect": "Shipping", "avg_sentiment": round(random.uniform(0.3, 0.5), 2), "mention_count": random.randint(140, 180), "impact_score": round(random.uniform(0.5, 0.7), 2), "priority": "fix_now"},
            {"aspect": "Customer Service", "avg_sentiment": round(random.uniform(0.6, 0.8), 2), "mention_count": random.randint(100, 140), "impact_score": round(random.uniform(0.6, 0.8), 2), "priority": "maintain"},
            {"aspect": "Price", "avg_sentiment": round(random.uniform(0.4, 0.6), 2), "mention_count": random.randint(120, 160), "impact_score": round(random.uniform(0.4, 0.6), 2), "priority": "monitor"},
        ]

        # Generate anomalies
        anomalies = [
            {"period": periods[3], "type": "negative_spike", "z_score": round(random.uniform(2.1, 2.8), 2)},
            {"period": periods[8], "type": "positive_spike", "z_score": round(random.uniform(2.0, 2.5), 2)},
        ]

        # Generate alerts
        alerts = [
            {"type": "warning", "message": "Shipping-related complaints increased 15% this week", "metric": "shipping_sentiment", "value": -0.15},
            {"type": "critical", "message": "Negative review spike detected on " + periods[3], "metric": "sentiment_anomaly", "value": -2.3},
        ]

        # NPS calculation
        promoters = sum(1 for r in reviews if r["rating"] == 5)
        passives = sum(1 for r in reviews if r["rating"] == 4)
        detractors = sum(1 for r in reviews if r["rating"] <= 3)
        nps_score = round(((promoters - detractors) / total) * 100)

        # Get sample reviews
        sorted_reviews = sorted(reviews, key=lambda x: x["score"], reverse=True)
        positive_samples = [{"text": r["text"], "score": r["score"]} for r in sorted_reviews[:5]]
        negative_samples = [{"text": r["text"], "score": r["score"]} for r in sorted_reviews[-5:]]

        return {
            "shop_domain": "demo-store.myshopify.com",
            "analysis_date": datetime.now().isoformat(),
            "review_count": total,
            "overview": {
                "avg_sentiment": round(avg_sentiment, 2),
                "positive_pct": round((positive / total) * 100, 1),
                "negative_pct": round((negative / total) * 100, 1),
                "neutral_pct": round((neutral / total) * 100, 1),
                "distribution": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral,
                }
            },
            "nps": {
                "nps_proxy": nps_score,
                "promoters": promoters,
                "promoters_pct": round((promoters / total) * 100, 1),
                "passives": passives,
                "passives_pct": round((passives / total) * 100, 1),
                "detractors": detractors,
                "detractors_pct": round((detractors / total) * 100, 1),
                "total": total,
            },
            "topics": topics,
            "aspects": aspects,
            "pain_points": pain_points,
            "key_drivers": key_drivers,
            "trends": {
                "periods": periods,
                "sentiment": sentiment_values,
                "moving_avg": moving_avg,
                "volume": volume,
            },
            "anomalies": anomalies,
            "alerts": alerts,
            "sample_reviews": {
                "positive": positive_samples,
                "negative": negative_samples,
            },
            "is_demo": True,
        }


# Singleton instance
demo_data_generator = DemoDataGenerator()
