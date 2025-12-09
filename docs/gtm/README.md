# Project Message Generator

This script processes the `narrowed.yaml` file and adds personalized outreach messages to each project using Anthropic's Claude API.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

## Usage

```bash
cd docs/gtm
python process.py
```

The script will:

1. Load all projects from `narrowed.yaml`
2. For each project without a `message` field, generate a personalized outreach message using Claude
3. Save the updated YAML file with the new messages
4. Skip projects that already have messages

## Features

- **Personalized messages**: Each message is customized based on the project name, username, and description
- **Innovation extraction**: Automatically identifies key innovations from project descriptions
- **Subscription relevance**: Tailors the pitch to show how Tributary subscriptions could benefit their specific project
- **YAML preservation**: Maintains proper YAML formatting and structure
- **Resume capability**: Skips projects that already have messages, allowing you to run multiple times
- **Error handling**: Graceful fallbacks if API calls fail

## Message Template

Each generated message follows this structure:

- Personal greeting with username
- Specific mention of their project and innovation
- Connection to subscription model benefits
- Tributary pitch with technical details
- Call to action with GitHub and Telegram links
- Personal sign-off from Fabian

## Output

The script updates the `narrowed.yaml` file by adding a `message` field to each project entry. The YAML structure is preserved with proper formatting.
