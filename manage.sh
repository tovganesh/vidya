#!/usr/bin/env bash
# ==============================================================================
# Vidya — Docker Container Lifecycle & School Deployment Profile Manager
# ==============================================================================
# Unified CLI to manage development, production, and institutional school profiles.
# ==============================================================================

set -eo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
MAGENTA="\033[0;35m"
BLUE="\033[0;34m"
DIM="\033[2m"
RESET="\033[0m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
PROFILES_DIR="${ROOT_DIR}/profiles"

mkdir -p "${PROFILES_DIR}"

# Helper print functions
log_info() {
  echo -e "${CYAN}ℹ [Vidya]${RESET} $1"
}

log_success() {
  echo -e "${GREEN}✔ [Vidya]${RESET} ${BOLD}$1${RESET}"
}

log_warn() {
  echo -e "${YELLOW}⚠ [Vidya]${RESET} $1"
}

log_error() {
  echo -e "${RED}✖ [Vidya]${RESET} ${BOLD}$1${RESET}" >&2
}

# Ensure Docker daemon is accessible
check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed or not available in PATH."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker Engine / Docker Desktop."
    exit 1
  fi
}

# Display script help
show_help() {
  echo -e "${BOLD}Vidya Container & School Profile Manager${RESET}"
  echo -e "Unified management for development, production, and school deployment profiles."
  echo ""
  echo -e "${BOLD}Usage:${RESET}"
  echo -e "  ./manage.sh <command> [environment|profile-slug] [options]"
  echo -e "  ./manage.sh profile <subcommand> [slug] [options]"
  echo ""
  echo -e "${BOLD}Container Lifecycle Commands:${RESET}"
  echo -e "  ${GREEN}start${RESET} [env|slug]        Start containers (e.g. 'dev', 'prod', or school slug)"
  echo -e "  ${YELLOW}stop${RESET} [env|slug]         Stop running containers"
  echo -e "  ${CYAN}restart${RESET} [env|slug]      Restart containers"
  echo -e "  ${BOLD}status${RESET} [env|slug]       Check status, health, and port mappings (alias: ps)"
  echo -e "  ${CYAN}logs${RESET} [env|slug]         Stream container logs (supports -f / --follow)"
  echo -e "  ${RED}down${RESET} [env|slug]         Stop and tear down containers and network"
  echo -e "  ${BOLD}build${RESET} [slug]            Rebuild Docker container images"
  echo ""
  echo -e "${BOLD}School Deployment Profiles:${RESET}"
  echo -e "  ${MAGENTA}profile create${RESET} [slug]   Create a new school production deployment profile"
  echo -e "  ${MAGENTA}profile list${RESET}            List all configured school deployment profiles"
  echo -e "  ${MAGENTA}profile show${RESET} <slug>     Display full configuration for a school profile"
  echo -e "  ${MAGENTA}profile delete${RESET} <slug>   Delete a school deployment profile"
  echo ""
  echo -e "${BOLD}Available Theme Colors:${RESET}"
  echo -e "  ${BLUE}indigo${RESET}   Signature Royal Indigo (Default)"
  echo -e "  ${GREEN}emerald${RESET}  Forest & Nature Green (Growth / Modern)"
  echo -e "  ${CYAN}ocean${RESET}    Academic Deep Cyan (Clean / Technology)"
  echo -e "  ${YELLOW}amber${RESET}    Royal Heritage Gold (Excellence / Classic)"
  echo -e "  ${RED}rose${RESET}     Vibrant Crimson Rose (Energetic / Prestigious)"
  echo -e "  ${DIM}slate${RESET}    Minimalist Modern Monochrome"
  echo ""
  echo -e "${BOLD}Examples:${RESET}"
  echo -e "  ./manage.sh start dev                                # Start local dev database & cache"
  echo -e "  ./manage.sh profile create dps-blr                  # Interactively create DPS profile"
  echo -e "  ./manage.sh start prod dps-blr                      # Deploy DPS with custom theme & name"
  echo -e "  ./manage.sh status                                  # Global overview of all containers"
  echo -e "  ./manage.sh profile list                            # List all created school profiles"
}

# Generate cryptographically secure random token (hex)
generate_secret() {
  local length="${1:-24}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$length"
  else
    head -c 32 /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | head -c "$((length * 2))"
  fi
}

# Create a new school deployment profile
cmd_profile_create() {
  local slug="$1"
  shift || true

  local school_name=""
  local school_desc=""
  local school_theme="indigo"
  local school_mode="dark"
  local school_code=""
  local school_board="CBSE"
  local school_affiliation=""
  local school_email=""
  local school_phone=""
  local school_city="Bengaluru"
  local school_state="Karnataka"
  local http_port="80"
  local backend_port="4000"
  local postgres_port="5432"
  local valkey_port="6379"
  local interactive=true

  # Parse command line flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) school_name="$2"; shift 2 ;;
      --desc|--description) school_desc="$2"; shift 2 ;;
      --theme) school_theme="$2"; shift 2 ;;
      --mode) school_mode="$2"; shift 2 ;;
      --code) school_code="$2"; shift 2 ;;
      --board) school_board="$2"; shift 2 ;;
      --affiliation) school_affiliation="$2"; shift 2 ;;
      --email) school_email="$2"; shift 2 ;;
      --phone) school_phone="$2"; shift 2 ;;
      --city) school_city="$2"; shift 2 ;;
      --state) school_state="$2"; shift 2 ;;
      --http-port) http_port="$2"; shift 2 ;;
      --backend-port) backend_port="$2"; shift 2 ;;
      --no-interactive) interactive=false; shift ;;
      *) shift ;;
    esac
  done

  # Interactive wizard if terminal is attached and key details missing
  if [ "$interactive" = true ] && [ -t 0 ]; then
    echo -e "\n${BOLD}${MAGENTA}=== Vidya School Deployment Profile Wizard ===${RESET}\n"
    
    if [ -z "$slug" ]; then
      read -rp "Enter unique school slug [e.g. dps-blr]: " slug
    fi

    # Sanitize slug
    slug=$(echo "$slug" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | sed 's/^-//;s/-$//')
    if [ -z "$slug" ]; then
      log_error "Invalid slug. Use lowercase alphanumeric characters and hyphens."
      exit 1
    fi

    if [ -f "${PROFILES_DIR}/${slug}.env" ]; then
      read -rp "Profile '${slug}' already exists. Overwrite? (y/N): " overwrite
      if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        log_info "Aborted profile creation."
        exit 0
      fi
    fi

    if [ -z "$school_name" ]; then
      read -rp "School Full Name [e.g. Delhi Public School, Bengaluru]: " input_val
      school_name="${input_val:-Delhi Public School, Bengaluru}"
    fi

    if [ -z "$school_code" ]; then
      local default_code
      default_code=$(echo "$slug" | tr '[:lower:]' '[:upper:]' | tr '-' '-')-01
      read -rp "School Short Code [${default_code}]: " input_val
      school_code="${input_val:-$default_code}"
    fi

    if [ -z "$school_desc" ]; then
      read -rp "School Tagline / Description [Affiliated with CBSE, New Delhi]: " input_val
      school_desc="${input_val:-Affiliated with CBSE, New Delhi}"
    fi

    echo -e "\n${BOLD}Select Curriculum / Board:${RESET}"
    echo -e "  1) CBSE (Central Board of Secondary Education)"
    echo -e "  2) ICSE (Council for the Indian School Certificate)"
    echo -e "  3) STATE (State Secondary Education Board)"
    read -rp "Choice [1-3, default: 1]: " board_choice
    case "$board_choice" in
      2) school_board="ICSE" ;;
      3) school_board="STATE" ;;
      *) school_board="CBSE" ;;
    esac

    read -rp "Affiliation Number [optional]: " school_affiliation
    read -rp "City [${school_city}]: " input_val
    school_city="${input_val:-$school_city}"
    read -rp "State [${school_state}]: " input_val
    school_state="${input_val:-$school_state}"
    read -rp "Principal / Administrative Email [admin@${slug}.edu]: " input_val
    school_email="${input_val:-admin@${slug}.edu}"
    read -rp "Institutional Phone [+91 80 2500 0000]: " input_val
    school_phone="${input_val:-+91 80 2500 0000}"

    echo -e "\n${BOLD}Select Primary Theme Color:${RESET}"
    echo -e "  1) ${BLUE}indigo${RESET}   Signature Royal Indigo (Default)"
    echo -e "  2) ${GREEN}emerald${RESET}  Forest & Nature Green (Growth & Ecology)"
    echo -e "  3) ${CYAN}ocean${RESET}    Academic Deep Cyan (Clean & Modern)"
    echo -e "  4) ${YELLOW}amber${RESET}    Royal Heritage Gold (Excellence & Tradition)"
    echo -e "  5) ${RED}rose${RESET}     Vibrant Crimson Rose (Prestigious & Energetic)"
    echo -e "  6) ${DIM}slate${RESET}    Minimalist Modern Monochrome"
    read -rp "Theme Choice [1-6, default: 1]: " theme_choice
    case "$theme_choice" in
      2) school_theme="emerald" ;;
      3) school_theme="ocean" ;;
      4) school_theme="amber" ;;
      5) school_theme="rose" ;;
      6) school_theme="slate" ;;
      *) school_theme="indigo" ;;
    esac

    echo -e "\n${BOLD}Select Default Theme Mode:${RESET}"
    echo -e "  1) Dark Theme (Signature Vidya OS Glassmorphic)"
    echo -e "  2) Light Theme (High Contrast Clean Slate)"
    read -rp "Mode Choice [1-2, default: 1]: " mode_choice
    case "$mode_choice" in
      2) school_mode="light" ;;
      *) school_mode="dark" ;;
    esac

    read -rp "HTTP Port for Frontend [${http_port}]: " input_val
    http_port="${input_val:-$http_port}"
    read -rp "Backend API Port [${backend_port}]: " input_val
    backend_port="${input_val:-$backend_port}"
  fi

  # Slug sanitization & defaults if called non-interactively
  slug=$(echo "${slug:-school-deployment}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | sed 's/^-//;s/-$//')
  school_name="${school_name:-$slug}"
  school_code="${school_code:-$(echo "$slug" | tr '[:lower:]' '[:upper:]')}"
  school_desc="${school_desc:-The Open School Operating System}"

  local clean_slug
  clean_slug=$(echo "$slug" | tr '-' '_')

  # Generate unique passwords & secrets
  local db_password jwt_access jwt_refresh cookie_secret
  db_password=$(generate_secret 12)
  jwt_access=$(generate_secret 24)
  jwt_refresh=$(generate_secret 24)
  cookie_secret=$(generate_secret 24)

  local profile_file="${PROFILES_DIR}/${slug}.env"

  cat <<EOF > "${profile_file}"
# ==============================================================================
# Vidya School Deployment Profile: ${school_name}
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

# School Metadata & Institutional Identity
SCHOOL_SLUG="${slug}"
SCHOOL_NAME="${school_name}"
SCHOOL_CODE="${school_code}"
SCHOOL_DESCRIPTION="${school_desc}"
SCHOOL_BOARD="${school_board}"
SCHOOL_AFFILIATION_NO="${school_affiliation}"
SCHOOL_EMAIL="${school_email}"
SCHOOL_PHONE="${school_phone}"
SCHOOL_CITY="${school_city}"
SCHOOL_STATE="${school_state}"

# Visual Theme Selection (indigo | emerald | ocean | amber | rose | slate)
SCHOOL_THEME_COLOR="${school_theme}"
# Theme Mode (dark | light)
SCHOOL_THEME_MODE="${school_mode}"

# Network & Port Bindings
HTTP_PORT="${http_port}"
BACKEND_PORT="${backend_port}"
POSTGRES_PORT="${postgres_port}"
VALKEY_PORT="${valkey_port}"
CORS_ORIGIN="http://localhost:${http_port}"

# Container Isolation & Persistence
COMPOSE_PROJECT_NAME="vidya-${slug}"
CONTAINER_PREFIX="vidya_${clean_slug}"
PGDATA_VOLUME="vidya_${clean_slug}_pgdata"
VALKEYDATA_VOLUME="vidya_${clean_slug}_valkeydata"

# Database Credentials
POSTGRES_USER="vidya"
POSTGRES_PASSWORD="${db_password}"
POSTGRES_DB="vidya_db"

# Security Secrets (Cryptographically random tokens)
JWT_ACCESS_SECRET="${jwt_access}"
JWT_REFRESH_SECRET="${jwt_refresh}"
COOKIE_SECRET="${cookie_secret}"
EOF

  log_success "Deployment profile created at: ${profile_file}"
  echo -e "\n${BOLD}=== Profile Summary: ${school_name} ===${RESET}"
  echo -e "  • Slug         : ${CYAN}${slug}${RESET}"
  echo -e "  • Code         : ${school_code}"
  echo -e "  • Board        : ${school_board}"
  echo -e "  • Description  : ${school_desc}"
  echo -e "  • Theme        : ${BOLD}${school_theme}${RESET} (${school_mode} mode)"
  echo -e "  • HTTP Port    : ${http_port} (Frontend SPA)"
  echo -e "  • API Port     : ${backend_port} (Backend Engine)"
  echo -e "\n${BOLD}To deploy this school stack:${RESET}"
  echo -e "  ${GREEN}./manage.sh start prod ${slug}${RESET}"
}

# List all configured school deployment profiles
cmd_profile_list() {
  echo -e "\n${BOLD}=== Configured School Deployment Profiles ===${RESET}\n"

  local count=0
  printf "%-18s %-32s %-8s %-16s %-10s %-12s\n" "SLUG" "SCHOOL NAME" "BOARD" "THEME" "PORT" "STATUS"
  printf "%-18s %-32s %-8s %-16s %-10s %-12s\n" "----------------" "------------------------------" "------" "--------------" "--------" "----------"

  for file in "${PROFILES_DIR}"/*.env; do
    [ -f "$file" ] || continue
    count=$((count + 1))

    local p_slug p_name p_board p_theme p_mode p_port p_proj
    p_slug=$(grep -E "^SCHOOL_SLUG=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_name=$(grep -E "^SCHOOL_NAME=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_board=$(grep -E "^SCHOOL_BOARD=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_theme=$(grep -E "^SCHOOL_THEME_COLOR=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_mode=$(grep -E "^SCHOOL_THEME_MODE=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_port=$(grep -E "^HTTP_PORT=" "$file" | cut -d '=' -f2- | tr -d '"\r')
    p_proj=$(grep -E "^COMPOSE_PROJECT_NAME=" "$file" | cut -d '=' -f2- | tr -d '"\r')

    # Status check
    local status="${DIM}Stopped${RESET}"
    if docker ps --filter "label=com.docker.compose.project=${p_proj}" --format '{{.Names}}' | grep -q .; then
      status="${GREEN}Running${RESET}"
    fi

    local theme_str="${p_theme:-indigo} (${p_mode:-dark})"
    printf "%-18s %-32s %-8s %-16s %-10s %-12b\n" "${p_slug}" "${p_name:0:30}" "${p_board:-CBSE}" "${theme_str}" ":${p_port:-80}" "${status}"
  done

  if [ "$count" -eq 0 ]; then
    echo -e "${YELLOW}No school profiles configured yet.${RESET}"
    echo -e "Create one with: ${BOLD}./manage.sh profile create <slug>${RESET}\n"
  else
    echo -e "\nTotal profiles: ${BOLD}${count}${RESET}\n"
  fi
}

# Show full details of a specific profile
cmd_profile_show() {
  local slug="$1"
  if [ -z "$slug" ]; then
    log_error "Please specify a school slug. Usage: ./manage.sh profile show <slug>"
    exit 1
  fi

  local profile_file="${PROFILES_DIR}/${slug}.env"
  if [ ! -f "$profile_file" ]; then
    log_error "Profile '${slug}' not found in ${PROFILES_DIR}/"
    exit 1
  fi

  echo -e "\n${BOLD}=== Configuration: ${slug} ===${RESET}"
  grep -vE '^#' "$profile_file" | grep -vE '^\s*$' | while IFS='=' read -r key val; do
    # Obfuscate sensitive credentials
    if [[ "$key" =~ SECRET|PASSWORD ]]; then
      val="••••••••••••••••••••••••••••••••"
    fi
    printf "  ${CYAN}%-26s${RESET} : %s\n" "$key" "$val"
  done
  echo ""
}

# Delete a profile
cmd_profile_delete() {
  local slug="$1"
  if [ -z "$slug" ]; then
    log_error "Please specify a school slug. Usage: ./manage.sh profile delete <slug>"
    exit 1
  fi

  local profile_file="${PROFILES_DIR}/${slug}.env"
  if [ ! -f "$profile_file" ]; then
    log_error "Profile '${slug}' not found."
    exit 1
  fi

  local p_proj="vidya-${slug}"
  if docker ps --filter "label=com.docker.compose.project=${p_proj}" --format '{{.Names}}' | grep -q .; then
    log_error "Profile '${slug}' containers are currently RUNNING. Stop them first:"
    echo -e "  ./manage.sh down prod ${slug}"
    exit 1
  fi

  read -rp "Are you sure you want to delete profile '${slug}'? (y/N): " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    rm -f "$profile_file"
    log_success "Profile '${slug}' deleted."
  else
    log_info "Operation cancelled."
  fi
}

# Configure environment variables and profiles
setup_environment() {
  local target_env="$1"
  local school_slug="$2"

  ENV_FILE_FLAG=()

  # Check if a school profile exists
  if [ -n "$school_slug" ] && [ -f "${PROFILES_DIR}/${school_slug}.env" ]; then
    local pfile="${PROFILES_DIR}/${school_slug}.env"
    ENV_FILE_FLAG=(--env-file "${pfile}")
    log_info "Loaded school profile: ${BOLD}${school_slug}${RESET} (${pfile})"

    # Source variables from profile
    set -a
    # shellcheck disable=SC1090
    source "${pfile}"
    set +a

    COMPOSE_PROJECT_NAME="vidya-${school_slug}"
    CONTAINER_PREFIX="vidya_$(echo "$school_slug" | tr '-' '_')"
    RESTART_POLICY="always"
    PGDATA_VOLUME="vidya_$(echo "$school_slug" | tr '-' '_')_pgdata"
    VALKEYDATA_VOLUME="vidya_$(echo "$school_slug" | tr '-' '_')_valkeydata"
    NODE_ENV="production"
    PROFILE_ARGS=(--profile prod)
    CURRENT_SCHOOL_NAME="${SCHOOL_NAME:-$school_slug}"
    CURRENT_SCHOOL_THEME="${SCHOOL_THEME_COLOR:-indigo}"

  elif [ "$target_env" = "prod" ]; then
    if [ -f "${ROOT_DIR}/.env.prod" ]; then
      ENV_FILE_FLAG=(--env-file "${ROOT_DIR}/.env.prod")
      log_info "Loaded configuration from .env.prod"
    elif [ -f "${ROOT_DIR}/.env" ]; then
      ENV_FILE_FLAG=(--env-file "${ROOT_DIR}/.env")
    fi

    COMPOSE_PROJECT_NAME="vidya-prod"
    CONTAINER_PREFIX="vidya_prod"
    RESTART_POLICY="always"
    PGDATA_VOLUME="vidya_prod_pgdata"
    VALKEYDATA_VOLUME="vidya_prod_valkeydata"
    NODE_ENV="production"
    PROFILE_ARGS=(--profile prod)
    CURRENT_SCHOOL_NAME="Vidya Production"
    CURRENT_SCHOOL_THEME="indigo"

  else
    if [ -f "${ROOT_DIR}/.env.dev" ]; then
      ENV_FILE_FLAG=(--env-file "${ROOT_DIR}/.env.dev")
    elif [ -f "${ROOT_DIR}/.env" ]; then
      ENV_FILE_FLAG=(--env-file "${ROOT_DIR}/.env")
    fi

    COMPOSE_PROJECT_NAME="vidya"
    CONTAINER_PREFIX="vidya"
    RESTART_POLICY="unless-stopped"
    PGDATA_VOLUME="vidya_pgdata"
    VALKEYDATA_VOLUME="vidya_valkeydata"
    NODE_ENV="development"
    PROFILE_ARGS=()
    CURRENT_SCHOOL_NAME="Vidya Dev"
    CURRENT_SCHOOL_THEME="indigo"
  fi

  export COMPOSE_PROJECT_NAME CONTAINER_PREFIX RESTART_POLICY PGDATA_VOLUME VALKEYDATA_VOLUME NODE_ENV
}

# Run docker compose wrapper
run_compose() {
  local target_env="$1"
  local school_slug="$2"
  shift 2

  setup_environment "$target_env" "$school_slug"
  docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${COMPOSE_FILE}" ${ENV_FILE_FLAG:+"${ENV_FILE_FLAG[@]}"} ${PROFILE_ARGS:+"${PROFILE_ARGS[@]}"} "$@"
}

# Display status for environments / school profiles
show_status() {
  local target_env="$1"
  local school_slug="$2"

  if [ -n "$school_slug" ]; then
    echo -e "\n${BOLD}=== School Profile: ${school_slug} (Project: vidya-${school_slug}) ===${RESET}"
    run_compose "prod" "$school_slug" ps -a
    echo ""
    return
  fi

  if [ "$target_env" = "dev" ]; then
    echo -e "\n${BOLD}=== Development Environment (vidya) ===${RESET}"
    run_compose "dev" "" ps -a
    echo ""
  elif [ "$target_env" = "prod" ]; then
    echo -e "\n${BOLD}=== Default Production Environment (vidya-prod) ===${RESET}"
    run_compose "prod" "" ps -a
    echo ""
  else
    # Show global status across dev, prod, and active school profiles
    echo -e "\n${BOLD}=== Development Environment (vidya) ===${RESET}"
    run_compose "dev" "" ps -a || true

    echo -e "\n${BOLD}=== Default Production Environment (vidya-prod) ===${RESET}"
    run_compose "prod" "" ps -a || true

    # Check any active school profiles
    local found_school=false
    for file in "${PROFILES_DIR}"/*.env; do
      [ -f "$file" ] || continue
      local s_slug s_proj
      s_slug=$(grep -E "^SCHOOL_SLUG=" "$file" | cut -d '=' -f2- | tr -d '"\r')
      s_proj="vidya-${s_slug}"

      if docker ps --filter "label=com.docker.compose.project=${s_proj}" --format '{{.Names}}' | grep -q .; then
        found_school=true
        echo -e "\n${BOLD}=== Active School Deployment: ${s_slug} (${s_proj}) ===${RESET}"
        run_compose "prod" "$s_slug" ps -a || true
      fi
    done

    if [ "$found_school" = false ]; then
      echo -e "\n${DIM}(No custom school deployment profiles currently running)${RESET}"
    fi
    echo ""
  fi
}

# Main entrypoint
main() {
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi

  # Handle profile subcommands first
  if [ "$1" = "profile" ]; then
    shift
    local subcmd="${1:-list}"
    shift || true

    case "$subcmd" in
      create|new)
        cmd_profile_create "$@"
        exit 0
        ;;
      list|ls)
        cmd_profile_list
        exit 0
        ;;
      show|get)
        cmd_profile_show "$1"
        exit 0
        ;;
      delete|rm)
        cmd_profile_delete "$1"
        exit 0
        ;;
      *)
        log_error "Unknown profile command: ${subcmd}"
        echo -e "Available: create, list, show, delete"
        exit 1
        ;;
    esac
  fi

  check_docker

  # Parse input arguments (action, env, slug, flags)
  ACTION=""
  ENV_MODE=""
  SCHOOL_SLUG=""
  EXTRA_ARGS=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      start|stop|restart|status|ps|logs|down|build)
        ACTION="$1"
        shift
        ;;
      dev|development)
        ENV_MODE="dev"
        shift
        ;;
      prod|production)
        ENV_MODE="prod"
        shift
        ;;
      -h|--help|help)
        show_help
        exit 0
        ;;
      *)
        # Check if argument matches a known profile slug
        if [ -f "${PROFILES_DIR}/$1.env" ]; then
          SCHOOL_SLUG="$1"
          ENV_MODE="prod"
          shift
        else
          EXTRA_ARGS+=("$1")
          shift
        fi
        ;;
    esac
  done

  # Status alias normalisation
  if [ "$ACTION" = "ps" ]; then
    ACTION="status"
  fi

  if [ -z "$ACTION" ]; then
    if [ -n "$ENV_MODE" ] || [ -n "$SCHOOL_SLUG" ]; then
      show_status "$ENV_MODE" "$SCHOOL_SLUG"
      exit 0
    fi
    show_help
    exit 1
  fi

  # Default environment to dev if unspecified for general status
  if [ -z "$ENV_MODE" ]; then
    if [ "$ACTION" = "status" ]; then
      show_status "" ""
      exit 0
    else
      log_warn "No environment or profile specified. Defaulting to '${BOLD}dev${RESET}'."
      ENV_MODE="dev"
    fi
  fi

  case "$ACTION" in
    start)
      if [ -n "$SCHOOL_SLUG" ]; then
        log_info "Deploying production stack for school: ${BOLD}${SCHOOL_SLUG}${RESET}..."
        run_compose "prod" "$SCHOOL_SLUG" up -d --build "${EXTRA_ARGS[@]}"
        log_success "Deployment active for: ${CURRENT_SCHOOL_NAME}!"
        echo -e "  • Institutional Identity : ${BOLD}${CURRENT_SCHOOL_NAME}${RESET}"
        echo -e "  • Theme Palette          : ${BOLD}${CURRENT_SCHOOL_THEME}${RESET}"
        echo -e "  • Web Portal (PWA)       : ${CYAN}http://localhost:${HTTP_PORT:-80}${RESET}"
        echo -e "  • Backend API & Health   : ${CYAN}http://localhost:${BACKEND_PORT:-4000}/api/v1/health${RESET}"
        echo -e "  • Public Branding API    : ${CYAN}http://localhost:${BACKEND_PORT:-4000}/api/v1/schools/branding${RESET}"
        echo -e "  • PostgreSQL Port        : localhost:${POSTGRES_PORT:-5432}"
        echo -e "  • Valkey Port            : localhost:${VALKEY_PORT:-6379}"
      elif [ "$ENV_MODE" = "prod" ]; then
        log_info "Starting default production stack..."
        run_compose "prod" "" up -d --build "${EXTRA_ARGS[@]}"
        log_success "Production stack started!"
        echo -e "  • Frontend App (Nginx PWA) : ${CYAN}http://localhost:${HTTP_PORT:-80}${RESET}"
        echo -e "  • Backend API & Health     : ${CYAN}http://localhost:${BACKEND_PORT:-4000}/api/v1/health${RESET}"
        echo -e "  • Public Branding API      : ${CYAN}http://localhost:${BACKEND_PORT:-4000}/api/v1/schools/branding${RESET}"
      else
        run_compose "dev" "" up -d "${EXTRA_ARGS[@]}"
        log_success "Development infrastructure started!"
        echo -e "  • PostgreSQL Database : ${CYAN}localhost:${POSTGRES_PORT:-5432}${RESET}"
        echo -e "  • Valkey Cache        : ${CYAN}localhost:${VALKEY_PORT:-6379}${RESET}"
        echo -e "\nRun local app servers with: ${BOLD}npm run dev${RESET}"
      fi
      ;;

    stop)
      log_info "Stopping containers for [${BOLD}${SCHOOL_SLUG:-$ENV_MODE}${RESET}]..."
      run_compose "$ENV_MODE" "$SCHOOL_SLUG" stop "${EXTRA_ARGS[@]}"
      log_success "Containers stopped."
      ;;

    restart)
      log_info "Restarting containers for [${BOLD}${SCHOOL_SLUG:-$ENV_MODE}${RESET}]..."
      run_compose "$ENV_MODE" "$SCHOOL_SLUG" restart "${EXTRA_ARGS[@]}"
      log_success "Containers restarted."
      ;;

    status)
      show_status "$ENV_MODE" "$SCHOOL_SLUG"
      ;;

    logs)
      log_info "Streaming logs for [${BOLD}${SCHOOL_SLUG:-$ENV_MODE}${RESET}]..."
      run_compose "$ENV_MODE" "$SCHOOL_SLUG" logs "${EXTRA_ARGS[@]}"
      ;;

    down)
      log_info "Tearing down containers for [${BOLD}${SCHOOL_SLUG:-$ENV_MODE}${RESET}]..."
      run_compose "$ENV_MODE" "$SCHOOL_SLUG" down "${EXTRA_ARGS[@]}"
      log_success "Environment torn down."
      ;;

    build)
      log_info "Building container images for [${BOLD}${SCHOOL_SLUG:-$ENV_MODE}${RESET}]..."
      run_compose "prod" "$SCHOOL_SLUG" build "${EXTRA_ARGS[@]}"
      log_success "Build completed."
      ;;

    *)
      log_error "Unknown command: ${ACTION}"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
