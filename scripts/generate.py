import json, random, os, math
from pathlib import Path
from datetime import datetime, timedelta

HERE = Path(__file__).parent
DATA_DIR = HERE.parent / "data"

def gen_support(n=2000):
    random.seed(42)
    issues = [
        "Order not received", "Wrong item shipped", "Payment failed", "Account locked",
        "Refund not processed", "Login issues", "App crashing", "Feature not working",
        "Billing error", "Shipping delay", "Product defective", "Can't cancel subscription",
        "Password reset not working", "Promo code not applying", "Data not syncing",
        "Notification not received", "Can't update profile", "Integration error",
        "API rate limit exceeded", "Missing export feature"
    ]
    issue_categories = {
        "Order not received": "Shipping", "Wrong item shipped": "Shipping",
        "Payment failed": "Billing", "Account locked": "Account",
        "Refund not processed": "Billing", "Login issues": "Account",
        "App crashing": "Technical", "Feature not working": "Technical",
        "Billing error": "Billing", "Shipping delay": "Shipping",
        "Product defective": "Product", "Can't cancel subscription": "Billing",
        "Password reset not working": "Account", "Promo code not applying": "Billing",
        "Data not syncing": "Technical", "Notification not received": "Technical",
        "Can't update profile": "Account", "Integration error": "Technical",
        "API rate limit exceeded": "Technical", "Missing export feature": "Feature"
    }
    issue_complexity = {
        "Order not received": 2, "Wrong item shipped": 2, "Payment failed": 3,
        "Account locked": 3, "Refund not processed": 2, "Login issues": 2,
        "App crashing": 4, "Feature not working": 3, "Billing error": 3,
        "Shipping delay": 1, "Product defective": 2, "Can't cancel subscription": 3,
        "Password reset not working": 2, "Promo code not applying": 1,
        "Data not syncing": 3, "Notification not received": 1, "Can't update profile": 1,
        "Integration error": 4, "API rate limit exceeded": 2, "Missing export feature": 3
    }
    agent_skill = {f"agent_{i:03d}": random.uniform(0.6, 1.0) for i in range(1, 51)}
    agent_workload = {f"agent_{i:03d}": random.randint(5, 30) for i in range(1, 51)}
    channels = ["email", "chat", "phone", "social_media"]
    channel_weights = [0.30, 0.40, 0.20, 0.10]
    resolutions = ["Resolved", "Pending", "Escalated", "Waiting on Customer", "Closed"]
    res_weights = [40, 20, 15, 15, 10]
    customer_msg_templates = [
        "Hi, I'm having trouble with my {issue}. Can you help?",
        "My {issue} and I need this resolved ASAP. Order ID: {order_id}",
        "I've been trying to fix {issue} for days. Please assist. Reference: {order_id}",
        "Regarding my {issue} - this is unacceptable. Ticket: {order_id}",
        "Hello, I need support with {issue}. My order ID is {order_id}.",
        "Can someone help me with {issue}? I'm very frustrated. Case: {order_id}",
        "I'm writing about {issue}. Please resolve this immediately. Ref: {order_id}",
        "There's a problem: {issue}. I need help right away. ID: {order_id}"
    ]
    agent_msg_templates = [
        "I understand your frustration. Let me look into this for you. Can you provide more details?",
        "I apologize for the inconvenience. Let me check the status of your issue.",
        "Thank you for contacting us. I'll help you resolve this right away.",
        "I see the issue. Let me escalate this to our technical team.",
        "I'm sorry to hear about this. I've created a ticket and our team will investigate.",
        "Let me pull up your account to investigate. One moment please.",
        "I understand this is urgent. I'll prioritize your case.",
        "Thank you for your patience. I'm working on resolving this."
    ]
    out = []
    base_time = datetime(2024, 1, 1)
    for i in range(n):
        issue = random.choice(issues)
        category = issue_categories[issue]
        complexity = issue_complexity[issue]
        order_id = f"ORD-{random.randint(100000, 999999)}"
        agent = f"agent_{random.randint(1, 50):03d}"
        skill = agent_skill[agent]
        base_msgs = max(2, int(complexity * random.uniform(1, 2.5)))
        num_messages = min(12, base_msgs)
        messages = []
        current_time = base_time + timedelta(days=random.randint(0, 365), hours=random.randint(8, 20))
        for m in range(num_messages):
            if m % 2 == 0:
                role = "customer"
                text = random.choice(customer_msg_templates).format(issue=issue, order_id=order_id)
                current_time += timedelta(minutes=random.randint(5, 60))
            else:
                role = "agent"
                text = random.choice(agent_msg_templates).format()
                response_delay = random.randint(2, 30) / skill
                current_time += timedelta(minutes=response_delay)
            messages.append({
                "role": role,
                "text": text,
                "timestamp": current_time.isoformat()
            })
        resolution = random.choices(resolutions, weights=res_weights, k=1)[0]
        first_response = random.randint(1, 30) / skill
        if resolution == "Resolved":
            resolution_hours = round(random.lognormvariate(2, 0.8) * complexity / skill, 1)
            satisfaction = max(1, min(5, round(3 + (skill - 0.6) * 5 - complexity * 0.3 + random.gauss(0, 0.5))))
        elif resolution == "Escalated":
            resolution_hours = round(random.uniform(24, 72), 1)
            satisfaction = None
        else:
            resolution_hours = None
            satisfaction = None
        out.append({
            "id": f"supp_{i:06d}",
            "issue_type": issue,
            "category": category,
            "complexity": complexity,
            "channel": random.choices(channels, weights=channel_weights, k=1)[0],
            "customer_id": f"cust_{random.randint(10000, 99999)}",
            "agent_id": agent,
            "agent_skill": round(skill, 2),
            "messages": messages,
            "message_count": len(messages),
            "resolution": resolution,
            "satisfaction_score": satisfaction,
            "first_response_minutes": round(first_response, 1),
            "resolution_hours": resolution_hours,
            "created_at": messages[0]["timestamp"] if messages else base_time.isoformat(),
            "day_of_week": current_time.strftime("%A"),
            "hour_of_day": current_time.hour,
            "is_escalated": resolution == "Escalated",
            "msg_turns": len(messages) // 2,
        })
    return out

def main():
    data = gen_support()
    DATA_DIR.mkdir(exist_ok=True)
    out = DATA_DIR / "dataset.json"
    out.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Generated {len(data)} customer support conversation records")
    print(f"Saved to {out}")

if __name__ == "__main__":
    main()
