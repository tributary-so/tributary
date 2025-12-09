import yaml

# Load the projects
with open('projects.yaml', 'r') as f:
    data = yaml.safe_load(f)

projects = data['projects']

# Filter projects that mention subscription or recurring in description
filtered_projects = []
for project in projects:
    filtered_projects.append(dict(
        description=project["description"],
        name=project["name"],
        user=project["teamMembers"][0]["username"]
    ))

# Write to targets.yaml
with open('narrowed.yaml', 'w') as f:
    yaml.dump({'projects': filtered_projects}, f)
