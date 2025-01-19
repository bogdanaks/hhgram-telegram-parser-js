pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin master'
            }
        }
        stage('Prepare') {
            steps {
                sh 'cp /opt/hhgram/telegram-parser-js/.env /var/lib/jenkins/workspace/hhgram-telegram-parser-js/'
                sh 'cp /opt/hhgram/telegram-parser-js/sessions /var/lib/jenkins/workspace/hhgram-telegram-parser-js/sessions'
            }
        }
        stage('Run docker-compose') {
            steps {
                script {
                    sh 'docker-compose stop'
                    sh 'docker-compose up --build -d'
                }
            }
        }
    }
    post {
        always {
            echo 'Pipeline finished'
        }
    }
}
