#!/bin/bash
set -euo pipefail # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Cleanup function for temporary files
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Script failed with exit code $exit_code"
    fi
    exit "$exit_code"
}
trap cleanup EXIT

# Validate input parameter
if [ $# -ne 1 ]; then
    log_error "Usage: $0 <package-directory>"
    exit 1
fi

PACKAGE_DIR=$1

# Check if package directory exists
if [ ! -d "$PACKAGE_DIR" ]; then
    log_error "Package directory '$PACKAGE_DIR' does not exist"
    exit 1
fi

# Check if it's a directory under current path
if [ ! -d "$PACKAGE_DIR" ] || [ "$(dirname "$PACKAGE_DIR")" = "." ] && [ ! -f "${PACKAGE_DIR}/package.json" ]; then
    log_warn "Directory doesn't contain a package.json file"
fi

PACKAGE=${PACKAGE_DIR##*/}
log_info "Processing package: $PACKAGE"

# Check if we're in a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_error "You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Get the latest tag
TAG=$(git tag -l | grep "@tributary-so/${PACKAGE}-v" | sort -V | tail -n 1)

if [ -z "$TAG" ]; then
    log_error "No tags found for pattern: @tributary-so/${PACKAGE}-v"
    exit 1
fi

VERSION=${TAG##*-v}

# Validate version format (semver)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    log_error "Invalid version format: $VERSION"
    exit 1
fi

log_info "Preparing release for $PACKAGE@$VERSION"

# Check if tag exists locally, if not fetch it
if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    log_warn "Tag $TAG not found locally, fetching..."
    git fetch --tags || {
        log_error "Failed to fetch tags"
        exit 1
    }
fi

# Checkout the tag
log_info "Checking out $TAG"
git checkout "$TAG" || {
    log_error "Failed to checkout tag $TAG"
    exit 1
}

# Install dependencies
log_info "Installing dependencies (pnpm install)"
if ! pnpm install; then
    log_error "Failed to install dependencies"
    git checkout - 2>/dev/null || true # Attempt to go back
    exit 1
fi

# Navigate to package directory
if ! pushd "$PACKAGE_DIR" >/dev/null; then
    log_error "Failed to enter directory $PACKAGE_DIR"
    git checkout - 2>/dev/null || true
    exit 1
fi

# Install package-specific dependencies
log_info "Installing package dependencies"
if ! pnpm install; then
    log_error "Failed to install package dependencies"
    popd >/dev/null 2>&1 || true
    git checkout - 2>/dev/null || true
    exit 1
fi

# Update package.json version
log_info "Updating package version to $VERSION"
if ! npm version "$VERSION" --no-git-tag-version; then
    log_error "Failed to update package version"
    popd >/dev/null 2>&1 || true
    git checkout - 2>/dev/null || true
    exit 1
fi

# Verify version was set correctly
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
    log_error "Version mismatch: expected $VERSION, got $PACKAGE_VERSION"
    popd >/dev/null 2>&1 || true
    git checkout - 2>/dev/null || true
    exit 1
fi

# Publish to npm
log_info "Publishing to npm"
if ! pnpm publish --no-git-checks --access public; then
    log_error "Failed to publish package"
    # Revert version change before exiting
    git checkout package.json 2>/dev/null || true
    popd >/dev/null 2>&1 || true
    git checkout - 2>/dev/null || true
    exit 1
fi

log_info "Successfully published $PACKAGE@$VERSION"

# Cleanup: reset git state
log_info "Resetting git state"
if ! git reset --hard HEAD; then
    log_warn "Failed to reset git state, you may need to do it manually"
fi

# Return to original directory
popd >/dev/null 2>&1 || true

# Optional: switch back to previous branch
PREV_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ "$PREV_BRANCH" != "HEAD" ] && [ -n "$PREV_BRANCH" ]; then
    log_info "Switching back to branch: $PREV_BRANCH"
    git checkout "$PREV_BRANCH" 2>/dev/null || log_warn "Could not switch back to $PREV_BRANCH"
fi

log_info "Release completed successfully!"
