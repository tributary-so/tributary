#!/usr/bin/env python3
"""
Process narrowed.yaml projects and add personalized messages using Anthropic's Claude API.
"""

import yaml
import os
import re
from typing import Dict, Any, List
from anthropic import Anthropic

# Configuration
YAML_FILE_PATH = "projects.yaml"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY environment variable is required")

def load_yaml_projects(file_path: str) -> Dict[str, Any]:
    """Load projects from YAML file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        data = yaml.safe_load(file)
    return data

def save_yaml_projects(file_path: str, data: Dict[str, Any]) -> None:
    """Save projects back to YAML file with proper formatting."""
    with open(file_path, 'w', encoding='utf-8') as file:
        yaml.dump(data, file, default_flow_style=False, allow_unicode=True,
                  width=1000, indent=2, sort_keys=False)

def extract_specific_innovation(description: str) -> str:
    """Extract a specific innovation from the project description."""
    # Look for key innovation phrases and concepts
    description_lower = description.lower()

    # Common innovation patterns
    innovation_patterns = [
        r'ai[- ]powered ([^,.]+)',
        r'blockchain[- ]based ([^,.]+)',
        r'decentralized ([^,.]+)',
        r'zero[- ]knowledge ([^,.]+)',
        r'cross[- ]chain ([^,.]+)',
        r'real[- ]time ([^,.]+)',
        r'automated ([^,.]+)',
        r'privacy[- ]preserving ([^,.]+)',
        r'trustless ([^,.]+)',
        r'permissionless ([^,.]+)',
        r'on[- ]chain ([^,.]+)',
        r'smart ([^,.]+)',
        r'tokenized ([^,.]+)',
        r'gamified ([^,.]+)',
        r'social ([^,.]+)',
    ]

    for pattern in innovation_patterns:
        match = re.search(pattern, description_lower)
        if match:
            return match.group(0).replace('-', ' ')

    # Fallback: extract first unique concept mentioned
    words = description.split()[:50]  # First 50 words
    for i, word in enumerate(words):
        if any(keyword in word.lower() for keyword in ['protocol', 'platform', 'system', 'marketplace', 'solution', 'infrastructure']):
            context = ' '.join(words[max(0, i-2):i+3])
            return context

    # Final fallback
    return "innovative approach to Web3"

def generate_message_with_claude(project_name: str, username: str, description: str) -> str:
    """Generate a personalized message using Claude API."""

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    # Extract specific innovation
    innovation = extract_specific_innovation(description)

    prompt = f"""
Please create a personalized outreach message for a hackathon participant using this template:

---

Hey [Participant username],

Loved seeing [Project Name] in action at the hackathon – that [specific innovation - extracted from description] could be a subscription goldmine! Subscriptions aren't just about fees; they're about building loyal users who pay you automatically every month, freeing you to focus on epic features.

Enter Tributary: We make Solana subscriptions effortless. Delegate USDC once, and renewals happen like clockwork – zero friction for customers, steady revenue for you. Think Netflix on Solana: charge monthly for tiers, analytics, or access, with fees under $0.01 per transaction.

And for #Cypherpunk participants like you, we have full integration at no cost – we're betting on your success!

Dive into the code: <https://github.com/tributary-so>
Hop on Telegram for dev support: <https://t.me/tributaryso>

Excited to see what we can build together!

-- Cheers, Fabian from Tributary

---

Fill in these details:
- Project Name: {project_name}
- Participant username: {username}
- Project Description: {description[:500]}...

Guidelines:
1. Keep the message personal and convincing but not stretched
2. Extract the most relevant innovation/feature from the description
3. Make it clear how subscriptions could benefit their specific project
4. Keep the same structure and closing
5. Don't make it too long or overly salesy
6. Focus on genuine connection to their project

Return only the final message, no explanation needed.
"""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=800,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        # Extract text content from Claude response
        text_content = ""
        for content_block in message.content:
            if content_block.type == "text":
                text_content += content_block.text

        return text_content.strip() if text_content else str(message.content)

    except Exception as e:
        print(f"Error generating message for {project_name}: {str(e)}")
        # Fallback message
        return f"""Hey {username},

Loved seeing {project_name} in action at the hackathon – that {innovation} could be a subscription goldmine! Subscriptions aren't just about fees; they're about building loyal users who pay you automatically every month, freeing you to focus on epic features.

Enter Tributary: We make Solana subscriptions effortless. Delegate USDC once, and renewals happen like clockwork – zero friction for customers, steady revenue for you. Think Netflix on Solana: charge monthly for tiers, analytics, or access, with fees under $0.01 per transaction.

And for #Cypherpunk participants like you, we have full integration at no cost – we're betting on your success!

Dive into the code: <https://github.com/tributary-so>
Hop on Telegram for dev support: <https://t.me/tributaryso>

Excited to see what we can build together!

-- Cheers, Fabian from Tributary"""

def process_projects():
    """Main processing function."""
    print("Loading projects from YAML file...")
    data = load_yaml_projects(YAML_FILE_PATH)

    projects = data.get('projects', [])
    total_projects = len(projects)

    print(f"Found {total_projects} projects to process")
    try:

        for i, project in enumerate(projects, 1):
            project_name = project.get('name', 'Unknown Project')
            username = project["teamMembers"][0]["username"]
            description = project.get('description', '')

            print(f"\nProcessing {i}/{total_projects}: {project_name} by {username}")

            # Skip if message already exists
            if 'message' in project and project['message']:
                print(f"  → Skipping - message already exists")
                continue

            # Generate message using Claude
            try:
                message = generate_message_with_claude(project_name, username, description)
                project['message'] = message
                print(f"  → Generated message ({len(message)} chars)")

            except Exception as e:
                print(f"  → Error: {str(e)}")
                continue

    except KeyboardInterrupt as e:
        pass

    # Save updated data
    print(f"\nSaving updated YAML file...")
    save_yaml_projects(YAML_FILE_PATH, data)
    print("✅ Processing complete!")

    # Print summary
    with_messages = sum(1 for p in projects if p.get('message'))
    print(f"\nSummary:")
    print(f"  Total projects: {total_projects}")
    print(f"  Projects with messages: {with_messages}")
    print(f"  Remaining: {total_projects - with_messages}")

if __name__ == "__main__":
    process_projects()
