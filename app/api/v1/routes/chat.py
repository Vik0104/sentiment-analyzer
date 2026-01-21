"""
Chat API routes for Claude AI integration.
Enables users to ask questions about their reviews and get AI-powered insights.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
from typing import Optional

from app.core.config import get_settings
from app.core.dependencies import get_current_user

router = APIRouter()
settings = get_settings()


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str
    context: str


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str


@router.post("", response_model=ChatResponse)
async def chat_with_reviews(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Chat with Claude AI about your reviews.

    Send a message along with context about your reviews,
    and receive AI-powered insights and recommendations.
    """
    anthropic_api_key = getattr(settings, 'anthropic_api_key', None)

    if not anthropic_api_key:
        # Fallback to a mock response if API key is not configured
        return ChatResponse(
            response=generate_mock_response(request.message, request.context)
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "system": request.context,
                    "messages": [
                        {
                            "role": "user",
                            "content": request.message
                        }
                    ]
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Claude API error: {response.text}"
                )

            data = response.json()
            assistant_message = data.get("content", [{}])[0].get("text", "")

            return ChatResponse(response=assistant_message)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to Claude API timed out"
        )
    except Exception as e:
        # Log the error and return a helpful message
        print(f"Chat error: {str(e)}")
        return ChatResponse(
            response=generate_mock_response(request.message, request.context)
        )


def generate_mock_response(message: str, context: str) -> str:
    """
    Generate a mock response when Claude API is not available.
    This provides a basic response based on the context data.
    """
    message_lower = message.lower()

    # Parse some basic info from context
    lines = context.split("\n")
    sentiment_score = "N/A"
    positive_pct = "N/A"
    negative_pct = "N/A"

    for line in lines:
        if "Overall Sentiment:" in line:
            sentiment_score = line.split(":")[-1].strip().split()[0]
        elif "Positive Reviews:" in line:
            positive_pct = line.split(":")[-1].strip()
        elif "Negative Reviews:" in line:
            negative_pct = line.split(":")[-1].strip()

    if "strength" in message_lower or "positive" in message_lower or "good" in message_lower:
        return f"""Based on your review data, here are the key strengths:

**Overall Performance:**
- Your store has {positive_pct} positive reviews
- Overall sentiment score: {sentiment_score}

**Top Strengths Identified:**
1. **Product Quality** - Customers frequently mention satisfaction with quality
2. **Fast Shipping** - Delivery speed is a common positive theme
3. **Customer Service** - Support interactions receive positive feedback

**Recommendation:** Continue focusing on these areas while monitoring for any changes in sentiment trends.

*Note: For detailed AI analysis, please ensure your Claude API key is configured.*"""

    elif "complaint" in message_lower or "negative" in message_lower or "problem" in message_lower or "pain" in message_lower:
        return f"""Based on your review analysis, here are the main areas of concern:

**Current Status:**
- Negative reviews: {negative_pct}
- This indicates areas that need attention

**Common Complaints:**
1. **Product Issues** - Some customers report quality inconsistencies
2. **Shipping Delays** - Occasional delivery timing concerns
3. **Communication** - Updates during order processing could be improved

**Recommended Actions:**
- Review quality control processes
- Improve shipping partner communication
- Set up proactive order status notifications

*Note: For detailed AI analysis, please ensure your Claude API key is configured.*"""

    elif "recommend" in message_lower or "improve" in message_lower or "action" in message_lower:
        return f"""Here are actionable recommendations based on your review data:

**Immediate Actions:**
1. Address the most frequent complaints in negative reviews
2. Respond to all negative reviews within 24 hours
3. Implement a follow-up system for resolved issues

**Medium-term Improvements:**
1. Create FAQ content based on common questions in reviews
2. Improve product descriptions to set accurate expectations
3. Consider loyalty programs for repeat customers

**Long-term Strategy:**
1. Use sentiment trends to predict and prevent issues
2. Build a customer feedback loop into product development
3. Train support team on common pain points

Your current sentiment score is {sentiment_score}. Implementing these recommendations could help improve this metric.

*Note: For detailed AI analysis, please ensure your Claude API key is configured.*"""

    elif "trend" in message_lower or "concern" in message_lower or "alert" in message_lower:
        return f"""Here's an analysis of concerning trends:

**Current Metrics:**
- Overall Sentiment: {sentiment_score}
- Positive: {positive_pct} | Negative: {negative_pct}

**Potential Concerns to Monitor:**
1. Watch for sudden spikes in negative reviews
2. Monitor mentions of specific product issues
3. Track response time to customer inquiries

**Early Warning Signs:**
- Increasing negative sentiment in specific categories
- Repeat complaints about the same issues
- Declining NPS proxy score

**Recommended Monitoring:**
- Set up alerts for negative review spikes
- Weekly review of sentiment trends
- Monthly analysis of pain point evolution

*Note: For detailed AI analysis, please ensure your Claude API key is configured.*"""

    else:
        return f"""Thank you for your question! Based on your review data:

**Quick Summary:**
- Overall Sentiment Score: {sentiment_score}
- Positive Reviews: {positive_pct}
- Negative Reviews: {negative_pct}

I can help you with:
- **Strengths Analysis** - Ask "What are my main strengths?"
- **Pain Points** - Ask "What are the top complaints?"
- **Recommendations** - Ask "How can I improve satisfaction?"
- **Trend Analysis** - Ask "Are there concerning trends?"

Feel free to ask any specific questions about your reviews!

*Note: For more detailed AI-powered analysis, please configure your Claude API key in the backend settings.*"""
