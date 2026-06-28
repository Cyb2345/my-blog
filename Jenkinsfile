pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(true)
    }

    parameters {
        gitParameter(
            name: 'BRANCH',
            type: 'PT_BRANCH',
            branchFilter: 'origin/(.*)',
            defaultValue: 'main',
            selectedValue: 'DEFAULT',
            sortMode: 'DESCENDING_SMART',
            quickFilterEnabled: true,
            listSize: '10',
            description: '请选择要部署的 Git 分支。GitHub 推送 main 自动触发时默认部署 main。'
        )
    }

    environment {
        GIT_URL = 'https://github.com/Cyb2345/my-blog.git'

        DEPLOY_DIR = '/opt/personal-blog'
        COMPOSE_FILE = 'docker-compose.yml'
        ENV_FILE = '/opt/.env'

        APP_URL = 'https://www.ccby.us'
        API_HEALTH_URL = 'https://www.ccby.us/api/v1/health'
    }

    stages {
        stage('Prepare') {
            steps {
                sh '''
                set -e

                echo "===== Prepare deploy directory ====="

                if [ -z "${DEPLOY_DIR}" ] || [ "${DEPLOY_DIR}" = "/" ] || [ "${DEPLOY_DIR}" = "/opt" ]; then
                  echo "ERROR: unsafe DEPLOY_DIR=${DEPLOY_DIR}"
                  exit 1
                fi

                mkdir -p "${DEPLOY_DIR}"

                echo "===== Check basic tools ====="
                git --version
                docker version
                docker compose version

                echo "===== Check env file ====="
                test -f "${ENV_FILE}" || {
                  echo "ERROR: ${ENV_FILE} not found"
                  echo "Please make sure /opt/.env is mounted into Jenkins container."
                  exit 1
                }

                echo "===== Check required env keys ====="
                grep -q '^DATABASE_URL=' "${ENV_FILE}" || {
                  echo "ERROR: DATABASE_URL not found in ${ENV_FILE}"
                  exit 1
                }

                grep -q '^SECRET_KEY=' "${ENV_FILE}" || {
                  echo "ERROR: SECRET_KEY not found in ${ENV_FILE}"
                  exit 1
                }

                echo "===== Check docker network ====="
                docker network inspect traefik_proxy >/dev/null 2>&1 || {
                  echo "traefik_proxy network not found, creating..."
                  docker network create traefik_proxy
                }

                echo "===== Mark git safe directory ====="
                git config --global --add safe.directory "${DEPLOY_DIR}" || true
                '''
            }
        }

        stage('Checkout Code') {
            steps {
                sh '''
                set -e

                echo "===== Checkout code ====="

                if [ -z "${DEPLOY_DIR}" ] || [ "${DEPLOY_DIR}" = "/" ] || [ "${DEPLOY_DIR}" = "/opt" ]; then
                  echo "ERROR: unsafe DEPLOY_DIR=${DEPLOY_DIR}"
                  exit 1
                fi

                TARGET_BRANCH="${BRANCH:-main}"
                TARGET_BRANCH="${TARGET_BRANCH#origin/}"
                TARGET_BRANCH="${TARGET_BRANCH#refs/heads/}"

                if [ -z "${TARGET_BRANCH}" ]; then
                  TARGET_BRANCH="main"
                fi

                echo "===== Selected deploy branch: ${TARGET_BRANCH} ====="

                mkdir -p "${DEPLOY_DIR}"

                cd "${DEPLOY_DIR}"

                if [ -d ".git" ]; then
                  echo "===== Existing git repository found, update code ====="
                  git remote set-url origin "${GIT_URL}" || true

                  echo "===== Fetch selected branch ====="
                  git fetch --prune origin "+refs/heads/${TARGET_BRANCH}:refs/remotes/origin/${TARGET_BRANCH}"

                  echo "===== Reset to origin/${TARGET_BRANCH} ====="
                  git reset --hard "origin/${TARGET_BRANCH}"

                  echo "===== Clean untracked files ====="
                  git clean -fdx
                else
                  echo "===== Not a git repository, clean deploy directory and clone ====="
                  find "${DEPLOY_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

                  git clone --branch "${TARGET_BRANCH}" "${GIT_URL}" "${DEPLOY_DIR}"
                fi

                cd "${DEPLOY_DIR}"

                echo "===== Current branch ====="
                git branch --show-current || true

                echo "===== Current commit ====="
                git log -1 --oneline
                '''
            }
        }

        stage('Check Config') {
            steps {
                sh '''
                set -e

                cd "${DEPLOY_DIR}"

                echo "===== Check required files ====="

                test -f "${COMPOSE_FILE}" || {
                  echo "ERROR: ${COMPOSE_FILE} not found in project root"
                  exit 1
                }

                test -f "backend/Dockerfile" || {
                  echo "ERROR: backend/Dockerfile not found"
                  exit 1
                }

                test -f "frontend/Dockerfile" || {
                  echo "ERROR: frontend/Dockerfile not found"
                  exit 1
                }

                test -f "${ENV_FILE}" || {
                  echo "ERROR: ${ENV_FILE} not found"
                  exit 1
                }

                echo "===== Check docker-compose env_file path ====="
                grep -q "/opt/.env" "${COMPOSE_FILE}" || {
                  echo "ERROR: ${COMPOSE_FILE} should use env_file: /opt/.env"
                  echo "Please update backend env_file in docker-compose.yml"
                  exit 1
                }

                echo "===== Check dangerous production command ====="
                if grep -q "seed_demo.py" "${COMPOSE_FILE}"; then
                  echo "ERROR: seed_demo.py found in ${COMPOSE_FILE}"
                  echo "Production deployment should not run demo seed script."
                  exit 1
                fi

                echo "===== Docker compose config check ====="
                docker compose -f "${COMPOSE_FILE}" config >/tmp/personal-blog-compose.yml

                echo "Config check passed"
                '''
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                set -e

                cd "${DEPLOY_DIR}"

                echo "===== Build backend and frontend images ====="
                docker compose -f "${COMPOSE_FILE}" build backend frontend
                '''
            }
        }

        stage('Database Migration') {
            steps {
                sh '''
                set -e

                cd "${DEPLOY_DIR}"

                echo "===== Run alembic migration ====="
                docker compose -f "${COMPOSE_FILE}" run --rm backend alembic upgrade head
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                set -e

                cd "${DEPLOY_DIR}"

                echo "===== Start backend and frontend ====="
                docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans backend frontend

                echo "===== Compose status ====="
                docker compose -f "${COMPOSE_FILE}" ps
                '''
            }
        }

        stage('Health Check') {
            steps {
                retry(6) {
                    sh '''
                    set -e

                    echo "===== Check API health ====="
                    curl -fsS "${API_HEALTH_URL}"

                    echo ""
                    echo "===== Check web page ====="
                    curl -fsS -o /dev/null "${APP_URL}"

                    echo "Health check passed"
                    '''
                    sleep time: 5, unit: 'SECONDS'
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                set +e

                echo "===== Cleanup dangling images ====="
                docker image prune -f
                '''
            }
        }
    }

    post {
        success {
            echo 'Deploy success'
        }

        failure {
            echo 'Deploy failed. Printing recent logs...'

            sh '''
            set +e

            echo "===== Current directory status ====="
            ls -la "${DEPLOY_DIR}" || true

            cd "${DEPLOY_DIR}" || exit 0

            if [ -f "${COMPOSE_FILE}" ]; then
              echo "===== docker compose ps ====="
              docker compose -f "${COMPOSE_FILE}" ps || true

              echo "===== backend logs ====="
              docker compose -f "${COMPOSE_FILE}" logs --tail=120 backend || true

              echo "===== frontend logs ====="
              docker compose -f "${COMPOSE_FILE}" logs --tail=120 frontend || true
            fi

            exit 0
            '''
        }
    }
}
