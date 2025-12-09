import requests
import yaml

base_url = "https://api.colosseum.org/api/projects"
params = {
    "hackathonIds[]": 5,
    "limit": 18,
    "offset": 0,
    "showWinnersOnly": "false",
    "sort": "RANDOM",
    "seed": "b64972e53e23654b"
}

all_projects = []

while True:
    response = requests.get(base_url, params=params)
    response.raise_for_status()
    data = response.json()
    projects = data.get("projects", [])
    if not projects:
        break
    all_projects.extend(projects)
    params["offset"] += 18

with open("projects.yaml", "w") as f:
    yaml.dump({"projects": all_projects}, f)