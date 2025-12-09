import click
import yaml
import requests
from datetime import datetime
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
    with open(file_path, "r", encoding="utf-8") as file:
        data = yaml.safe_load(file)
    return data


def save_yaml_projects(file_path: str, data: Dict[str, Any]) -> None:
    """Save projects back to YAML file with proper formatting."""
    print("Storing projects.yaml ...")
    with open(file_path, "w", encoding="utf-8") as file:
        yaml.dump(
            data,
            file,
            default_flow_style=False,
            allow_unicode=True,
            width=1000,
            indent=2,
            sort_keys=False,
        )


def generate_message_with_claude(project_name: str, username: str, description: str) -> str:
    """Generate a personalized message using Claude API."""

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

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
        raise e

access_token = "eyJraWQiOiJkLTE3NjMwNTA2NDYyMjUiLCJ0eXAiOiJKV1QiLCJ2ZXJzaW9uIjoiNCIsImFsZyI6IlJTMjU2In0.eyJpYXQiOjE3NjMzODcwNDUsImV4cCI6MTc2MzQxMTY4OSwic3ViIjoiYzllYTc3MWUtMGJjZi00MWUyLWJlOWEtYmEwMmYwN2M5OTZlIiwidElkIjoicHVibGljIiwic2Vzc2lvbkhhbmRsZSI6IjI2MDZiMWU0LWYxNWQtNGFjZi1hZDlkLTAwMzBhY2Y0YTNlNiIsInJlZnJlc2hUb2tlbkhhc2gxIjoiYzc0YmI5NmQyNzM3NTgwMmJjYjAyMWM2ODU0YmQyZWIwZDdjMjBmYzU3MDU2M2ZlN2FkMzI1MDZmNjkyMTQ0ZCIsInBhcmVudFJlZnJlc2hUb2tlbkhhc2gxIjpudWxsLCJhbnRpQ3NyZlRva2VuIjpudWxsLCJpc3MiOiJodHRwczovL2FwaS5jb2xvc3NldW0ub3JnL2F1dGgiLCJzdC1ldiI6eyJ2Ijp0cnVlLCJ0IjoxNzYzMzg3MDQ1ODU1fSwiX2ludGVybmFsX3VzZXJfaWQiOjI2MDM5LCJfZW1haWwiOiJmYWJpYW5AZGllLXNjaHVocy5kZSIsIl91c2VybmFtZSI6Inhlcm9jIiwiX2Rpc3BsYXlfbmFtZSI6IkZhYmlhbiBTY2h1aCIsIl9vbmJvYXJkaW5nX2NvbXBsZXRlIjp0cnVlLCJfcHJvZmlsZV9jb21wbGV0ZSI6dHJ1ZSwiX2FncmVlbWVudF9jb21wbGV0ZSI6dHJ1ZSwiX2F2YXRhcl91cmwiOiJodHRwczovL3N0YXRpYy5uYXJyYXRpdmUtdmlvbGF0aW9uLmNvbS9DLXJ0a1dUSlNJLUJSamdXTzk4WVoiLCJfYWNjb3VudF9yb2xlcyI6W10sIl9hY2NlbGVyYXRvcl9iYXRjaGVzIjpbXX0.c7r8kauZiI44rR1hTcJAQlzKyyH4tgvJnQgyJXshY8VsVtU-MFvvv597OCufg5c8rSKd534MlPkcQGEFds6Fo-0X_CEid2zAylvaitJMG3p8ztk71BU-s1dxa88noHdIafrXniDo0qV9PJgZxbdgp3CuhQtZ73ykh2ttgs5BMDGmFZ4x5Dvhf7JTYZIphaheUCxRCmkvFPhA1DKjvtV0loao5seS-B6aH8n7bAEGv2sImALlIjNeh2tn-AVi3c2-shokx_aQckOCkPba8sS8Wx7aWsABuowOoQmlQc1VFkgrcQeF7V0XbfAJaYf17NOz5PJz7SgCYDboJiC-opJ76w"


@click.command()
@click.argument("name")
def main(name):
    data = load_yaml_projects("projects.yaml")
    projects = data["projects"]
    try:

        # Filter projects that mention subscription or recurring in description
        for project in projects:
            username = project["teamMembers"][0]["username"]
            description = project["description"]
            project_name = project["name"]

            if project_name.lower() != name.lower():
                continue

            if "messaged_at" in project:
                continue  # Skip already messaged

            if "skipped_at" in project:
                continue  # Skip already messaged

            print(f"Username:    {username}")
            print("Description", description)
            if not click.confirm("Proceed?"):
                project["skipped_at"] = datetime.now().isoformat()
                continue

            if not project.get("message"):
                print("Generating message via LLM ...")
                project["message"] = generate_message_with_claude(project_name, username, description)

            print("=" * 80)
            print(project["message"])
            print("=" * 80)
            if not click.confirm("Proceed?"):
                continue

            # Send POST request
            url = "https://api.colosseum.org/api/chat/message"
            headers = {"Content-Type": "application/json"}
            cookies = {"sAccessToken": access_token}
            payload = {
                "content": project["message"],
                "receiverId": project["teamMembers"][0]["id"],
            }
            response = requests.post(
                url, json=payload, headers=headers, cookies=cookies
            )
            print("=" * 80)
            if response.status_code == 200:
                project["messaged_at"] = datetime.now().isoformat()
                print(response.json()["message"])
            else:
                print(f"Failed to send message: {response.status_code}")
            print("=" * 80)
            print()
    except KeyboardInterrupt:
        pass
    finally:
        # Write back to YAML
        save_yaml_projects(YAML_FILE_PATH, data)


if __name__ == "__main__":
    main()
