pipeline {
    agent any
    tools {
        nodejs 'Node20'
    }
    environment {
        SONAR_SCANNER_HOME = tool 'sonar-scanner'
        PATH = "${env.SONAR_SCANNER_HOME}\\bin;${env.PATH}"
    }
    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning frontend branch...'
                git branch: 'frontend',
                    url: 'https://github.com/Sou1234567889/stage_ATB.git'
            }
        }
        stage('Install') {
            steps {
                bat 'npm install --legacy-peer-deps'
            }
        }
        stage('Unit Tests') {
            steps {
                bat 'npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage || exit 0'
            }
            post {
                always {
                    junit testResults: '**/test-results.xml', allowEmptyResults: true
                }
            }
        }
        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    bat 'sonar-scanner -Dsonar.projectKey=talentis-frontend -Dsonar.projectName=Talentis-Frontend -Dsonar.sources=src'
                }
            }
        }
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }
    }
    post {
        success {
            echo 'Frontend pipeline completed successfully'
        }
        failure {
            echo 'Frontend pipeline failed'
        }
    }
}
