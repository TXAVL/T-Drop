const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 't-drop-translations');

// Localized translation dictionaries for the newly introduced features across all 31 supported languages
const featureTranslations = {
  en: {
    onboarding: {
      backupTitle: 'Backup & Restore Archive (.txa)',
      backupDesc: 'Export your clipboard history, pinned items, and settings into an encrypted .txa archive. Seamlessly transfer to a new PC or restore anytime with Merge or Overwrite modes.'
    },
    behaviour: {
      connectingDownload: 'Connecting to download server...',
      connecting: 'Connecting...',
      downloadingWithPercent: 'Downloading update ({percent}%)...',
      download: 'Download',
      notifyModeSubtitle: 'Notification mode · Click to download',
      newUpdateAvailable: 'New update available {version}'
    },
    backup: {
      title: 'Backup & Restore (.txa)',
      desc: 'Create encrypted standalone backups to preserve clipboard items, images, and settings across Windows reinstalls.',
      exportBtn: 'Export Backup (.txa)',
      importBtn: 'Import & Restore (.txa)',
      exportSuccess: 'Successfully created encrypted backup ({items} items)',
      exportFailed: 'Failed to create backup: {error}',
      importSuccess: 'Successfully restored {count} items into clipboard history',
      importFailed: 'Failed to restore backup: {error}',
      busyError: 'Another backup or restore operation is already in progress.',
      modalTitle: 'Restore T-Drop Backup',
      modalDesc: 'Review archive details and choose how to restore your data.',
      fileLabel: 'Backup File:',
      dateLabel: 'Created:',
      itemsLabel: 'Items:',
      imagesLabel: 'Images:',
      modeLabel: 'Restore Mode:',
      modeMerge: 'Merge (Recommended)',
      modeMergeDesc: 'Keep current items and add non-duplicate items from the backup.',
      modeOverwrite: 'Overwrite All',
      modeOverwriteDesc: 'Completely replace current history and settings with the backup.',
      confirmRestore: 'Restore Now',
      cancel: 'Cancel',
      restoring: 'Restoring...',
      autoDetectedTitle: 'Backup Archive Detected',
      previewTitle: 'Restore Preview',
      itemsUnit: 'items'
    }
  },
  vi: {
    onboarding: {
      backupTitle: 'Sao lưu & Khôi phục dữ liệu (.txa)',
      backupDesc: 'Đóng gói toàn bộ lịch sử, mục đã ghim và cài đặt vào tệp .txa được mã hóa an toàn. Dễ dàng chuyển sang máy mới hoặc khôi phục bất cứ lúc nào với 2 chế độ Gộp hoặc Ghi đè.'
    },
    behaviour: {
      connectingDownload: 'Đang kết nối máy chủ tải về...',
      connecting: 'Đang kết nối...',
      downloadingWithPercent: 'Đang tải bản cập nhật ({percent}%)...',
      download: 'Tải về',
      notifyModeSubtitle: 'Chế độ thông báo · Bấm để tải về',
      newUpdateAvailable: 'Có bản cập nhật mới {version}'
    },
    backup: {
      title: 'Sao lưu & Khôi phục (.txa)',
      desc: 'Tạo bản sao lưu mã hóa độc quyền để bảo vệ lịch sử bảng tạm, hình ảnh và cài đặt khi cài lại Windows.',
      exportBtn: 'Xuất bản sao lưu (.txa)',
      importBtn: 'Khôi phục dữ liệu (.txa)',
      exportSuccess: 'Đã tạo bản sao lưu mã hóa thành công ({items} mục)',
      exportFailed: 'Không thể tạo sao lưu: {error}',
      importSuccess: 'Đã khôi phục thành công {count} mục vào lịch sử',
      importFailed: 'Không thể khôi phục sao lưu: {error}',
      busyError: 'Một tiến trình sao lưu hoặc khôi phục đang được thực hiện.',
      modalTitle: 'Khôi phục dữ liệu T-Drop',
      modalDesc: 'Xem thông tin tệp sao lưu và chọn cách thức khôi phục dữ liệu.',
      fileLabel: 'Tệp sao lưu:',
      dateLabel: 'Thời gian tạo:',
      itemsLabel: 'Số lượng mục:',
      imagesLabel: 'Hình ảnh:',
      modeLabel: 'Chế độ khôi phục:',
      modeMerge: 'Gộp dữ liệu (Khuyên dùng)',
      modeMergeDesc: 'Giữ nguyên các mục hiện có và thêm các mục mới từ bản sao lưu.',
      modeOverwrite: 'Ghi đè toàn bộ',
      modeOverwriteDesc: 'Thay thế hoàn toàn lịch sử và cài đặt bằng dữ liệu trong bản sao lưu.',
      confirmRestore: 'Xác nhận khôi phục',
      cancel: 'Hủy',
      restoring: 'Đang khôi phục...',
      autoDetectedTitle: 'Phát hiện bản sao lưu T-Drop',
      previewTitle: 'Xem trước bản sao lưu',
      itemsUnit: 'mục'
    }
  },
  es: {
    onboarding: {
      backupTitle: 'Copia de seguridad y restauración (.txa)',
      backupDesc: 'Exporta tu historial del portapapeles, elementos fijados y ajustes a un archivo .txa cifrado. Restáuralo en cualquier momento con los modos Fusionar o Sobrescribir.'
    },
    behaviour: {
      connectingDownload: 'Conectando con el servidor de descarga...',
      connecting: 'Conectando...',
      downloadingWithPercent: 'Descargando actualización ({percent}%)...',
      download: 'Descargar',
      notifyModeSubtitle: 'Modo de notificación · Haz clic para descargar',
      newUpdateAvailable: 'Nueva actualización disponible {version}'
    },
    backup: {
      title: 'Copia de seguridad y restauración (.txa)',
      desc: 'Crea copias de seguridad cifradas para conservar elementos, imágenes y ajustes al reinstalar Windows.',
      exportBtn: 'Exportar copia (.txa)',
      importBtn: 'Restaurar datos (.txa)',
      exportSuccess: 'Copia creada con éxito ({items} elementos)',
      exportFailed: 'Error al crear la copia: {error}',
      importSuccess: 'Se restauraron {count} elementos con éxito',
      importFailed: 'Error al restaurar: {error}',
      busyError: 'Ya hay una operación de copia o restauración en curso.',
      modalTitle: 'Restaurar copia de seguridad T-Drop',
      modalDesc: 'Revisa los detalles del archivo y elige cómo restaurar tus datos.',
      fileLabel: 'Archivo de copia:',
      dateLabel: 'Fecha de creación:',
      itemsLabel: 'Elementos:',
      imagesLabel: 'Imágenes:',
      modeLabel: 'Modo de restauración:',
      modeMerge: 'Fusionar (Recomendado)',
      modeMergeDesc: 'Conserva los elementos actuales y añade los nuevos de la copia.',
      modeOverwrite: 'Sobrescribir todo',
      modeOverwriteDesc: 'Reemplaza completamente el historial y los ajustes con la copia.',
      confirmRestore: 'Confirmar restauración',
      cancel: 'Cancelar',
      restoring: 'Restaurando...',
      autoDetectedTitle: 'Copia de seguridad detectada',
      previewTitle: 'Vista previa de copia de seguridad',
      itemsUnit: 'elementos'
    }
  },
  fr: {
    onboarding: {
      backupTitle: 'Sauvegarde & Restauration (.txa)',
      backupDesc: 'Exportez votre historique du presse-papiers, éléments épinglés et paramètres dans une archive .txa chiffrée. Restaurez-la à tout moment en mode Fusion ou Écrasement.'
    },
    behaviour: {
      connectingDownload: 'Connexion au serveur de téléchargement...',
      connecting: 'Connexion...',
      downloadingWithPercent: 'Téléchargement de la mise à jour ({percent}%)...',
      download: 'Télécharger',
      notifyModeSubtitle: 'Mode notification · Cliquez pour télécharger',
      newUpdateAvailable: 'Nouvelle mise à jour disponible {version}'
    },
    backup: {
      title: 'Sauvegarde & Restauration (.txa)',
      desc: 'Créez des sauvegardes chiffrées pour préserver vos clips, images et réglages lors d’une réinstallation de Windows.',
      exportBtn: 'Exporter sauvegarde (.txa)',
      importBtn: 'Restaurer données (.txa)',
      exportSuccess: 'Sauvegarde créée avec succès ({items} éléments)',
      exportFailed: 'Échec de la sauvegarde : {error}',
      importSuccess: '{count} éléments restaurés avec succès',
      importFailed: 'Échec de la restauration : {error}',
      busyError: 'Une opération de sauvegarde ou de restauration est déjà en cours.',
      modalTitle: 'Restaurer la sauvegarde T-Drop',
      modalDesc: 'Vérifiez les détails et choisissez le mode de restauration.',
      fileLabel: 'Fichier de sauvegarde :',
      dateLabel: 'Date de création :',
      itemsLabel: 'Éléments :',
      imagesLabel: 'Images :',
      modeLabel: 'Mode de restauration :',
      modeMerge: 'Fusionner (Recommandé)',
      modeMergeDesc: 'Conserver les éléments actuels et ajouter les nouveaux.',
      modeOverwrite: 'Remplacer tout',
      modeOverwriteDesc: 'Remplacer entièrement l’historique et les réglages.',
      confirmRestore: 'Confirmer la restauration',
      cancel: 'Annuler',
      restoring: 'Restauration en cours...',
      autoDetectedTitle: 'Sauvegarde détectée',
      previewTitle: 'Aperçu de la sauvegarde',
      itemsUnit: 'éléments'
    }
  },
  de: {
    onboarding: {
      backupTitle: 'Sichern & Wiederherstellen (.txa)',
      backupDesc: 'Exportieren Sie Zwischenablage-Verlauf, angeheftete Elemente und Einstellungen in ein verschlüsseltes .txa-Archiv. Jederzeit zusammenführen oder überschreiben.'
    },
    behaviour: {
      connectingDownload: 'Verbindung zum Download-Server wird hergestellt...',
      connecting: 'Verbinden...',
      downloadingWithPercent: 'Update wird heruntergeladen ({percent}%)...',
      download: 'Herunterladen',
      notifyModeSubtitle: 'Benachrichtigungsmodus · Klicken zum Herunterladen',
      newUpdateAvailable: 'Neues Update verfügbar {version}'
    },
    backup: {
      title: 'Sichern & Wiederherstellen (.txa)',
      desc: 'Erstellen Sie verschlüsselte Sicherungen für Zwischenablage, Bilder und Einstellungen bei Neuinstallationen.',
      exportBtn: 'Sicherung exportieren (.txa)',
      importBtn: 'Daten wiederherstellen (.txa)',
      exportSuccess: 'Sicherung erfolgreich erstellt ({items} Elemente)',
      exportFailed: 'Sicherung fehlgeschlagen: {error}',
      importSuccess: '{count} Elemente erfolgreich wiederhergestellt',
      importFailed: 'Wiederherstellung fehlgeschlagen: {error}',
      busyError: 'Ein Sicherungs- oder Wiederherstellungsvorgang wird bereits ausgeführt.',
      modalTitle: 'T-Drop-Sicherung wiederherstellen',
      modalDesc: 'Überprüfen Sie die Archivdetails und wählen Sie den Wiederherstellungsmodus.',
      fileLabel: 'Sicherungsdatei:',
      dateLabel: 'Erstellungsdatum:',
      itemsLabel: 'Elemente:',
      imagesLabel: 'Bilder:',
      modeLabel: 'Wiederherstellungsmodus:',
      modeMerge: 'Zusammenführen (Empfohlen)',
      modeMergeDesc: 'Bestehende Elemente behalten und neue aus der Sicherung hinzufügen.',
      modeOverwrite: 'Alles überschreiben',
      modeOverwriteDesc: 'Aktuellen Verlauf und Einstellungen vollständig ersetzen.',
      confirmRestore: 'Wiederherstellung bestätigen',
      cancel: 'Abbrechen',
      restoring: 'Wiederherstellung läuft...',
      autoDetectedTitle: 'Sicherungsdatei erkannt',
      previewTitle: 'Sicherungsvorschau',
      itemsUnit: 'Elemente'
    }
  },
  it: {
    onboarding: {
      backupTitle: 'Backup e Ripristino (.txa)',
      backupDesc: 'Esporta cronologia appunti, elementi bloccati e impostazioni in un archivio cifrato .txa. Ripristina in qualsiasi momento.'
    },
    behaviour: {
      connectingDownload: 'Connessione al server di download...',
      connecting: 'Connessione...',
      downloadingWithPercent: 'Download aggiornamento in corso ({percent}%)...',
      download: 'Scarica',
      notifyModeSubtitle: 'Modalità notifica · Fai clic per scaricare',
      newUpdateAvailable: 'Nuovo aggiornamento disponibile {version}'
    },
    backup: {
      title: 'Backup e Ripristino (.txa)',
      desc: 'Crea backup crittografati per proteggere cronologia e impostazioni.',
      exportBtn: 'Esporta Backup (.txa)',
      importBtn: 'Ripristina Dati (.txa)',
      exportSuccess: 'Backup creato con successo ({items} elementi)',
      exportFailed: 'Impossibile creare il backup: {error}',
      importSuccess: '{count} elementi ripristinati con successo',
      importFailed: 'Ripristino non riuscito: {error}',
      busyError: 'Un’altra operazione di backup o ripristino è già in corso.',
      modalTitle: 'Ripristina Backup T-Drop',
      modalDesc: 'Verifica i dettagli dell’archivio e seleziona la modalità di ripristino.',
      fileLabel: 'File di backup:',
      dateLabel: 'Data creazione:',
      itemsLabel: 'Elementi:',
      imagesLabel: 'Immagini:',
      modeLabel: 'Modalità di ripristino:',
      modeMerge: 'Unisci (Consigliato)',
      modeMergeDesc: 'Mantieni gli elementi attuali e aggiungi quelli dal backup.',
      modeOverwrite: 'Sovrascrivi tutto',
      modeOverwriteDesc: 'Sostituisci completamente cronologia e impostazioni con il backup.',
      confirmRestore: 'Conferma ripristino',
      cancel: 'Annulla',
      restoring: 'Ripristino in corso...',
      autoDetectedTitle: 'File di backup rilevato',
      previewTitle: 'Anteprima backup',
      itemsUnit: 'elementi'
    }
  },
  pt: {
    onboarding: {
      backupTitle: 'Backup e Restauração (.txa)',
      backupDesc: 'Exporte com segurança o histórico da área de transferência, itens fixados e configurações para um arquivo .txa criptografado.'
    },
    behaviour: {
      connectingDownload: 'Conectando ao servidor de download...',
      connecting: 'Conectando...',
      downloadingWithPercent: 'Baixando atualização ({percent}%)...',
      download: 'Baixar',
      notifyModeSubtitle: 'Modo de notificação · Clique para baixar',
      newUpdateAvailable: 'Nova atualização disponível {version}'
    },
    backup: {
      title: 'Backup e Restauração (.txa)',
      desc: 'Crie backups criptografados para preservar itens, imagens e configurações.',
      exportBtn: 'Exportar Backup (.txa)',
      importBtn: 'Restaurar Dados (.txa)',
      exportSuccess: 'Backup criado com sucesso ({items} itens)',
      exportFailed: 'Falha ao criar backup: {error}',
      importSuccess: '{count} itens restaurados com sucesso',
      importFailed: 'Falha ao restaurar: {error}',
      busyError: 'Outra operação de backup ou restauração já está em andamento.',
      modalTitle: 'Restaurar Backup do T-Drop',
      modalDesc: 'Revise os detalhes do arquivo e escolha o método de restauração.',
      fileLabel: 'Arquivo de backup:',
      dateLabel: 'Data de criação:',
      itemsLabel: 'Itens:',
      imagesLabel: 'Imagens:',
      modeLabel: 'Modo de restauração:',
      modeMerge: 'Mesclar (Recomendado)',
      modeMergeDesc: 'Mantém os itens atuais e adiciona novos do backup.',
      modeOverwrite: 'Sobrescrever tudo',
      modeOverwriteDesc: 'Substitui completamente o histórico e as configurações pelo backup.',
      confirmRestore: 'Confirmar restauração',
      cancel: 'Cancelar',
      restoring: 'Restaurando...',
      autoDetectedTitle: 'Backup detectado',
      previewTitle: 'Pré-visualização do backup',
      itemsUnit: 'itens'
    }
  },
  ru: {
    onboarding: {
      backupTitle: 'Резервное копирование и восстановление (.txa)',
      backupDesc: 'Экспортируйте историю буфера, закрепленные элементы и настройки в зашифрованный архив .txa. Восстанавливайте в любое время.'
    },
    behaviour: {
      connectingDownload: 'Подключение к серверу загрузки...',
      connecting: 'Подключение...',
      downloadingWithPercent: 'Загрузка обновления ({percent}%)...',
      download: 'Скачать',
      notifyModeSubtitle: 'Режим уведомлений · Нажмите для загрузки',
      newUpdateAvailable: 'Доступно новое обновление {version}'
    },
    backup: {
      title: 'Резервное копирование и восстановление (.txa)',
      desc: 'Создавайте зашифрованные копии для сохранения истории буфера и настроек при переустановке Windows.',
      exportBtn: 'Экспорт копии (.txa)',
      importBtn: 'Восстановить данные (.txa)',
      exportSuccess: 'Резервная копия создана ({items} элементов)',
      exportFailed: 'Ошибка создания копии: {error}',
      importSuccess: 'Успешно восстановлено элементов: {count}',
      importFailed: 'Ошибка восстановления: {error}',
      busyError: 'Другая операция резервного копирования уже выполняется.',
      modalTitle: 'Восстановление резервной копии T-Drop',
      modalDesc: 'Проверьте данные архива и выберите режим восстановления.',
      fileLabel: 'Файл копии:',
      dateLabel: 'Дата создания:',
      itemsLabel: 'Элементы:',
      imagesLabel: 'Изображения:',
      modeLabel: 'Режим восстановления:',
      modeMerge: 'Объединить (Рекомендуется)',
      modeMergeDesc: 'Сохранить текущие элементы и добавить новые из копии.',
      modeOverwrite: 'Перезаписать все',
      modeOverwriteDesc: 'Полностью заменить текущую историю и настройки данными из копии.',
      confirmRestore: 'Подтвердить восстановление',
      cancel: 'Отмена',
      restoring: 'Восстановление...',
      autoDetectedTitle: 'Обнаружен файл резервной копии',
      previewTitle: 'Предпросмотр резервной копии',
      itemsUnit: 'элементов'
    }
  },
  ja: {
    onboarding: {
      backupTitle: 'バックアップと復元 (.txa)',
      backupDesc: 'クリップボード履歴、ピン留め項目、設定を暗号化された .txa アーカイブに安全にエクスポート。統合または上書きモードでいつでも復元できます。'
    },
    behaviour: {
      connectingDownload: 'ダウンロードサーバーに接続中...',
      connecting: '接続中...',
      downloadingWithPercent: 'アップデートをダウンロード中 ({percent}%)...',
      download: 'ダウンロード',
      notifyModeSubtitle: '通知モード · クリックしてダウンロード',
      newUpdateAvailable: '新しいアップデートがあります {version}'
    },
    backup: {
      title: 'バックアップと復元 (.txa)',
      desc: '暗号化されたバックアップを作成し、クリップボードや設定を安全に保護します。',
      exportBtn: 'バックアップをエクスポート (.txa)',
      importBtn: 'データを復元 (.txa)',
      exportSuccess: '暗号化バックアップを作成しました ({items} 件)',
      exportFailed: 'バックアップの作成に失敗しました: {error}',
      importSuccess: '{count} 件の項目を正常に復元しました',
      importFailed: '復元に失敗しました: {error}',
      busyError: '他のバックアップまたは復元処理が実行中です。',
      modalTitle: 'T-Drop バックアップの復元',
      modalDesc: 'ファイルの詳細を確認し、復元方法を選択してください。',
      fileLabel: 'バックアップファイル:',
      dateLabel: '作成日時:',
      itemsLabel: '項目数:',
      imagesLabel: '画像数:',
      modeLabel: '復元モード:',
      modeMerge: 'マージ (推奨)',
      modeMergeDesc: '現在の項目を保持し、バックアップから新しい項目を追加します。',
      modeOverwrite: 'すべて上書き',
      modeOverwriteDesc: '現在の履歴と設定をバックアップで完全に置き換えます。',
      confirmRestore: '復元を実行',
      cancel: 'キャンセル',
      restoring: '復元中...',
      autoDetectedTitle: 'バックアップファイルを検出',
      previewTitle: 'バックアップのプレビュー',
      itemsUnit: '件'
    }
  },
  ko: {
    onboarding: {
      backupTitle: '백업 및 복원 아카이브 (.txa)',
      backupDesc: '클립보드 기록, 고정 항목 및 설정을 암호화된 .txa 아카이브로 안전하게 내보내고 언제든지 병합 또는 덮어쓰기 모드로 복원하세요.'
    },
    behaviour: {
      connectingDownload: '다운로드 서버에 연결하는 중...',
      connecting: '연결 중...',
      downloadingWithPercent: '업데이트 다운로드 중 ({percent}%)...',
      download: '다운로드',
      notifyModeSubtitle: '알림 모드 · 클릭하여 다운로드',
      newUpdateAvailable: '새 업데이트 이용 가능 {version}'
    },
    backup: {
      title: '백업 및 복원 (.txa)',
      desc: '암호화된 백업을 생성하여 클립보드 항목, 이미지 및 설정을 안전하게 보관합니다.',
      exportBtn: '백업 내보내기 (.txa)',
      importBtn: '데이터 복원 (.txa)',
      exportSuccess: '암호화된 백업 생성 완료 ({items}개 항목)',
      exportFailed: '백업 생성 실패: {error}',
      importSuccess: '{count}개 항목을 성공적으로 복원했습니다',
      importFailed: '복원 실패: {error}',
      busyError: '다른 백업 또는 복원 작업이 이미 진행 중입니다.',
      modalTitle: 'T-Drop 백업 복원',
      modalDesc: '보관 파일 정보를 검토하고 복원 방식을 선택하세요.',
      fileLabel: '백업 파일:',
      dateLabel: '생성 날짜:',
      itemsLabel: '항목 수:',
      imagesLabel: '이미지 수:',
      modeLabel: '복원 모드:',
      modeMerge: '데이터 병합 (권장)',
      modeMergeDesc: '현재 항목을 유지하고 백업에서 새 항목을 추가합니다.',
      modeOverwrite: '전체 덮어쓰기',
      modeOverwriteDesc: '현재 기록과 설정을 백업 데이터로 완전히 교체합니다.',
      confirmRestore: '복원 확인',
      cancel: '취소',
      restoring: '복원 중...',
      autoDetectedTitle: '백업 파일 감지됨',
      previewTitle: '백업 미리보기',
      itemsUnit: '개'
    }
  },
  zhCN: {
    onboarding: {
      backupTitle: '备份与恢复存档 (.txa)',
      backupDesc: '将剪贴板历史记录、固定项和设置安全导出为加密的 .txa 归档文件。可随时通过合并或覆盖模式恢复。'
    },
    behaviour: {
      connectingDownload: '正在连接下载服务器...',
      connecting: '连接中...',
      downloadingWithPercent: '正在下载更新 ({percent}%)...',
      download: '下载',
      notifyModeSubtitle: '通知模式 · 点击下载',
      newUpdateAvailable: '发现新版本 {version}'
    },
    backup: {
      title: '备份与恢复 (.txa)',
      desc: '创建加密的独立备份，在重装系统时保护剪贴板项目、图片和设置。',
      exportBtn: '导出备份 (.txa)',
      importBtn: '恢复数据 (.txa)',
      exportSuccess: '成功创建加密备份（{items} 项）',
      exportFailed: '创建备份失败：{error}',
      importSuccess: '成功恢复 {count} 项记录',
      importFailed: '恢复失败：{error}',
      busyError: '已有备份或恢复操作正在进行中。',
      modalTitle: '恢复 T-Drop 备份',
      modalDesc: '查看存档详情并选择数据恢复方式。',
      fileLabel: '备份文件:',
      dateLabel: '创建时间:',
      itemsLabel: '项目数量:',
      imagesLabel: '图片数量:',
      modeLabel: '恢复模式:',
      modeMerge: '合并数据（推荐）',
      modeMergeDesc: '保留当前项目并追加备份中的非重复项。',
      modeOverwrite: '全部覆盖',
      modeOverwriteDesc: '完全清除现有记录并使用备份数据替代。',
      confirmRestore: '确认恢复',
      cancel: '取消',
      restoring: '正在恢复...',
      autoDetectedTitle: '检测到备份文件',
      previewTitle: '备份文件预览',
      itemsUnit: '项'
    }
  },
  zhTW: {
    onboarding: {
      backupTitle: '備份與還原封存 (.txa)',
      backupDesc: '將剪貼簿歷史記錄、釘選項目與設定安全匯出為加密的 .txa 封存檔。可隨時透過合併或覆寫模式還原。'
    },
    behaviour: {
      connectingDownload: '正在連線下載伺服器...',
      connecting: '連線中...',
      downloadingWithPercent: '正在下載更新 ({percent}%)...',
      download: '下載',
      notifyModeSubtitle: '通知模式 · 點擊下載',
      newUpdateAvailable: '有新版本可用 {version}'
    },
    backup: {
      title: '備份與還原 (.txa)',
      desc: '建立加密的獨立備份，在重灌系統時保留剪貼簿項目、圖片與設定。',
      exportBtn: '匯出備份 (.txa)',
      importBtn: '還原資料 (.txa)',
      exportSuccess: '成功建立加密備份（{items} 項）',
      exportFailed: '建立備份失敗：{error}',
      importSuccess: '成功還原 {count} 項記錄',
      importFailed: '還原失敗：{error}',
      busyError: '已有備份或還原操作正在進行中。',
      modalTitle: '還原 T-Drop 備份',
      modalDesc: '查看封存資訊並選擇資料還原方式。',
      fileLabel: '備份檔案:',
      dateLabel: '建立時間:',
      itemsLabel: '項目數量:',
      imagesLabel: '圖片數量:',
      modeLabel: '還原模式:',
      modeMerge: '合併資料（建議）',
      modeMergeDesc: '保留目前項目並加入備份中的新項目。',
      modeOverwrite: '全部覆寫',
      modeOverwriteDesc: '完全清除現有記錄並以備份資料取代。',
      confirmRestore: '確認還原',
      cancel: '取消',
      restoring: '正在還原...',
      autoDetectedTitle: '偵測到備份檔案',
      previewTitle: '備份檔案預覽',
      itemsUnit: '項'
    }
  },
  hi: {
    onboarding: {
      backupTitle: 'बैकअप और पुनर्स्थापना संग्रह (.txa)',
      backupDesc: 'अपने क्लिपबोर्ड इतिहास, पिन किए गए आइटम और सेटिंग्स को एक एन्क्रिप्टेड .txa संग्रह में सुरक्षित रूप से निर्यात करें।'
    },
    behaviour: {
      connectingDownload: 'डाउनलोड सर्वर से कनेक्ट हो रहा है...',
      connecting: 'कनेक्ट हो रहा है...',
      downloadingWithPercent: 'अपडेट डाउनलोड हो रहा है ({percent}%)...',
      download: 'डाउनलोड करें',
      notifyModeSubtitle: 'सूचना मोड · डाउनलोड करने के लिए क्लिक करें',
      newUpdateAvailable: 'नया अपडेट उपलब्ध है {version}'
    },
    backup: {
      title: 'बैकअप और पुनर्स्थापना (.txa)',
      desc: 'विंडोज पुनः स्थापित करने पर अपने क्लिप और सेटिंग्स को सुरक्षित रखने के लिए एन्क्रिप्टेड बैकअप बनाएं।',
      exportBtn: 'बैकअप निर्यात करें (.txa)',
      importBtn: 'डेटा पुनर्स्थापित करें (.txa)',
      exportSuccess: 'एन्क्रिप्टेड बैकअप सफलतापूर्वक बनाया गया ({items} आइटम)',
      exportFailed: 'बैकअप बनाने में विफल: {error}',
      importSuccess: '{count} आइटम सफलतापूर्वक पुनर्स्थापित किए गए',
      importFailed: 'पुनर्स्थापित करने में विफल: {error}',
      busyError: 'एक अन्य बैकअप या पुनर्स्थापना कार्य पहले से प्रगति पर है।',
      modalTitle: 'T-Drop बैकअप पुनर्स्थापित करें',
      modalDesc: 'संग्रह विवरण देखें और डेटा पुनर्स्थापित करने का तरीका चुनें।',
      fileLabel: 'बैकअप फ़ाइल:',
      dateLabel: 'निर्माण तिथि:',
      itemsLabel: 'आइटम:',
      imagesLabel: 'चित्र:',
      modeLabel: 'पुनर्स्थापना मोड:',
      modeMerge: 'मर्ज करें (अनुशंसित)',
      modeMergeDesc: 'वर्तमान आइटम रखें और बैकअप से नए आइटम जोड़ें।',
      modeOverwrite: 'सभी अधिलेखित करें',
      modeOverwriteDesc: 'मौजूदा इतिहास और सेटिंग्स को पूरी तरह से बैकअप से बदलें।',
      confirmRestore: 'पुनर्स्थापना की पुष्टि करें',
      cancel: 'रद्द करें',
      restoring: 'पुनर्स्थापित हो रहा है...',
      autoDetectedTitle: 'बैकअप फ़ाइल मिली',
      previewTitle: 'बैकअप पूर्वावलोकन',
      itemsUnit: 'आइटम'
    }
  },
  ar: {
    onboarding: {
      backupTitle: 'النسخ الاحتياطي والاستعادة (.txa)',
      backupDesc: 'قم بتصدير سجل الحافظة والعناصر المثبتة والإعدادات بأمان إلى أرشيف .txa مشفر.'
    },
    behaviour: {
      connectingDownload: 'جارٍ الاتصال بخادم التنزيل...',
      connecting: 'جارٍ الاتصال...',
      downloadingWithPercent: 'جارٍ تنزيل التحديث ({percent}%)...',
      download: 'تنزيل',
      notifyModeSubtitle: 'وضع الإشعار · انقر للتنزيل',
      newUpdateAvailable: 'يتوفر تحديث جديد {version}'
    },
    backup: {
      title: 'النسخ الاحتياطي والاستعادة (.txa)',
      desc: 'أنشئ نسخاً احتياطية مشفرة لحفظ سجل الحافظة والإعدادات عند إعادة تثبيت Windows.',
      exportBtn: 'تصدير نسخة احتياطية (.txa)',
      importBtn: 'استعادة البيانات (.txa)',
      exportSuccess: 'تم إنشاء النسخة الاحتياطية بنجاح ({items} عنصر)',
      exportFailed: 'فشل إنشاء النسخة الاحتياطية: {error}',
      importSuccess: 'تمت استعادة {count} عنصر بنجاح',
      importFailed: 'فشلت الاستعادة: {error}',
      busyError: 'هناك عملية نسخ احتياطي أو استعادة قيد التشغيل بالفعل.',
      modalTitle: 'استعادة نسخة T-Drop الاحتياطية',
      modalDesc: 'راجع تفاصيل الأرشيف واختر طريقة استعادة البيانات.',
      fileLabel: 'ملف النسخة الاحتياطية:',
      dateLabel: 'تاريخ الإنشاء:',
      itemsLabel: 'العناصر:',
      imagesLabel: 'الصور:',
      modeLabel: 'وضع الاستعادة:',
      modeMerge: 'دمج (موصى به)',
      modeMergeDesc: 'الاحتفاظ بالعناصر الحالية وإضافة عناصر جديدة من النسخة الاحتياطية.',
      modeOverwrite: 'استبدال الكل',
      modeOverwriteDesc: 'استبدال السجل والإعدادات الحالية بالكامل بالنسخة الاحتياطية.',
      confirmRestore: 'تأكيد الاستعادة',
      cancel: 'إلغاء',
      restoring: 'جارٍ الاستعادة...',
      autoDetectedTitle: 'تم اكتشاف ملف نسخة احتياطية',
      previewTitle: 'معاينة النسخة الاحتياطية',
      itemsUnit: 'عنصر'
    }
  },
  fa: {
    onboarding: {
      backupTitle: 'پشتیبان‌گیری و بازیابی (.txa)',
      backupDesc: 'تاریخچه کلیپ‌بورد، موارد پین‌شده و تنظیمات خود را به یک آرشیو رمزگذاری‌شده .txa صادر کنید.'
    },
    behaviour: {
      connectingDownload: 'در حال اتصال به سرور دانلود...',
      connecting: 'در حال اتصال...',
      downloadingWithPercent: 'در حال دانلود به‌روزرسانی ({percent}%)...',
      download: 'دانلود',
      notifyModeSubtitle: 'حالت اعلان · برای دانلود کلیک کنید',
      newUpdateAvailable: 'به‌روزرسانی جدید موجود است {version}'
    },
    backup: {
      title: 'پشتیبان‌گیری و بازیابی (.txa)',
      desc: 'پشتیبان‌های رمزگذاری‌شده ایجاد کنید تا تنظیمات و کلیپ‌ها حفظ شوند.',
      exportBtn: 'خروجی پشتیبان (.txa)',
      importBtn: 'بازیابی داده‌ها (.txa)',
      exportSuccess: 'پشتیبان با موفقیت ایجاد شد ({items} مورد)',
      exportFailed: 'خطا در ایجاد پشتیبان: {error}',
      importSuccess: '{count} مورد با موفقیت بازیابی شد',
      importFailed: 'خطا در بازیابی: {error}',
      busyError: 'عملیات پشتیبان‌گیری یا بازیابی دیگری در حال انجام است.',
      modalTitle: 'بازیابی پشتیبان T-Drop',
      modalDesc: 'جزئیات آرشیو را بررسی کرده و حالت بازیابی را انتخاب کنید.',
      fileLabel: 'فایل پشتیبان:',
      dateLabel: 'تاریخ ایجاد:',
      itemsLabel: 'تعداد موارد:',
      imagesLabel: 'تصاویر:',
      modeLabel: 'حالت بازیابی:',
      modeMerge: 'ادغام (پیشنهادی)',
      modeMergeDesc: 'موارد فعلی را نگه داشته و موارد جدید را اضافه کنید.',
      modeOverwrite: 'بازنویسی کامل',
      modeOverwriteDesc: 'جایگزینی کامل تاریخچه و تنظیمات با فایل پشتیبان.',
      confirmRestore: 'تأیید بازیابی',
      cancel: 'لغو',
      restoring: 'در حال بازیابی...',
      autoDetectedTitle: 'فایل پشتیبان شناسایی شد',
      previewTitle: 'پیش‌نمایش پشتیبان',
      itemsUnit: 'مورد'
    }
  },
  bn: {
    onboarding: {
      backupTitle: 'ব্যাকআপ ও পুনরুদ্ধার আর্কাইভ (.txa)',
      backupDesc: 'আপনার ক্লিপবোর্ড ইতিহাস, পিন করা আইটেম এবং সেটিংস একটি এনক্রিপ্ট করা .txa আর্কাইভে রপ্তানি করুন।'
    },
    behaviour: {
      connectingDownload: 'ডাউনলোড সার্ভারের সাথে সংযোগ স্থাপন করা হচ্ছে...',
      connecting: 'সংযোগ করা হচ্ছে...',
      downloadingWithPercent: 'আপডেট ডাউনলোড হচ্ছে ({percent}%)...',
      download: 'ডাউনলোড',
      notifyModeSubtitle: 'বিজ্ঞপ্তি মোড · ডাউনলোড করতে ক্লিক করুন',
      newUpdateAvailable: 'নতুন আপডেট উপলব্ধ {version}'
    },
    backup: {
      title: 'ব্যাকআপ ও পুনরুদ্ধার (.txa)',
      desc: 'উইন্ডোজ পুনরায় ইনস্টল করার সময় ডেটা সুরক্ষিত রাখতে এনক্রিপ্ট করা ব্যাকআপ তৈরি করুন।',
      exportBtn: 'ব্যাকআপ রপ্তানি (.txa)',
      importBtn: 'ডেটা পুনরুদ্ধার (.txa)',
      exportSuccess: 'এনক্রিপ্ট করা ব্যাকআপ সফলভাবে তৈরি হয়েছে ({items} আইটেম)',
      exportFailed: 'ব্যাকআপ তৈরি ব্যর্থ হয়েছে: {error}',
      importSuccess: '{count} আইটেম সফলভাবে পুনরুদ্ধার করা হয়েছে',
      importFailed: 'পুনরুদ্ধার ব্যর্থ হয়েছে: {error}',
      busyError: 'অন্য একটি ব্যাকআপ বা পুনরুদ্ধার প্রক্রিয়া চলছে।',
      modalTitle: 'T-Drop ব্যাকআপ পুনরুদ্ধার',
      modalDesc: 'আর্কাইভ বিবরণ পর্যালোচনা করুন এবং পুনরুদ্ধারের মোড নির্বাচন করুন।',
      fileLabel: 'ব্যাকআপ ফাইল:',
      dateLabel: 'তৈরির তারিখ:',
      itemsLabel: 'আইটেম:',
      imagesLabel: 'ছবি:',
      modeLabel: 'পুনরুদ্ধার মোড:',
      modeMerge: 'একত্রীকরণ (প্রস্তাবিত)',
      modeMergeDesc: 'বর্তমান আইটেমগুলি রাখুন এবং ব্যাকআপ থেকে নতুন আইটেম যুক্ত করুন।',
      modeOverwrite: 'সম্পূর্ণ ওভাররাইট',
      modeOverwriteDesc: 'বর্তমান ইতিহাস এবং সেটিংস সম্পূর্ণভাবে ব্যাকআপ দিয়ে প্রতিস্থাপন করুন।',
      confirmRestore: 'পুনরুদ্ধার নিশ্চিত করুন',
      cancel: 'বাতিল',
      restoring: 'পুনরুদ্ধার করা হচ্ছে...',
      autoDetectedTitle: 'ব্যাকআপ ফাইল সনাক্ত করা হয়েছে',
      previewTitle: 'ব্যাকআপ প্রাকদর্শন',
      itemsUnit: 'আইটেম'
    }
  },
  tr: {
    onboarding: {
      backupTitle: 'Yedekleme ve Geri Yükleme Arşivi (.txa)',
      backupDesc: 'Pano geçmişinizi, sabitlenen öğeleri ve ayarları şifreli bir .txa arşivine aktarın. İstediğiniz zaman Birleştir veya Üzerine Yaz modlarıyla geri yükleyin.'
    },
    behaviour: {
      connectingDownload: 'İndirme sunucusuna bağlanılıyor...',
      connecting: 'Bağlanılıyor...',
      downloadingWithPercent: 'Güncelleme indiriliyor ({percent}%)...',
      download: 'İndir',
      notifyModeSubtitle: 'Bildirim modu · İndirmek için tıklayın',
      newUpdateAvailable: 'Yeni güncelleme mevcut {version}'
    },
    backup: {
      title: 'Yedekleme ve Geri Yükleme (.txa)',
      desc: 'Windows yeniden yüklemelerinde pano öğelerini, resimleri ve ayarları korumak için şifreli bağımsız yedekler oluşturun.',
      exportBtn: 'Yedeği Dışa Aktar (.txa)',
      importBtn: 'Verileri Geri Yükle (.txa)',
      exportSuccess: 'Şifreli yedek başarıyla oluşturuldu ({items} öğe)',
      exportFailed: 'Yedekleme oluşturulamadı: {error}',
      importSuccess: '{count} öğe başarıyla geri yüklendi',
      importFailed: 'Geri yükleme başarısız: {error}',
      busyError: 'Başka bir yedekleme veya geri yükleme işlemi zaten devam ediyor.',
      modalTitle: 'T-Drop Yedeğini Geri Yükle',
      modalDesc: 'Arşiv ayrıntılarını inceleyin ve verilerinizi nasıl geri yükleyeceğinizi seçin.',
      fileLabel: 'Yedek Dosyası:',
      dateLabel: 'Oluşturulma Tarihi:',
      itemsLabel: 'Öğe Sayısı:',
      imagesLabel: 'Resim Sayısı:',
      modeLabel: 'Geri Yükleme Modu:',
      modeMerge: 'Birleştir (Önerilen)',
      modeMergeDesc: 'Mevcut öğeleri koruyun ve yedekten yeni öğeleri ekleyin.',
      modeOverwrite: 'Tümünün Üzerine Yaz',
      modeOverwriteDesc: 'Mevcut geçmişi ve ayarları tamamen yedekle değiştirin.',
      confirmRestore: 'Geri Yüklemeyi Onayla',
      cancel: 'İptal',
      restoring: 'Geri yükleniyor...',
      autoDetectedTitle: 'Yedek Dosyası Algılandı',
      previewTitle: 'Yedek Önizlemesi',
      itemsUnit: 'öğe'
    }
  },
  pl: {
    onboarding: {
      backupTitle: 'Kopia zapasowa i przywracanie (.txa)',
      backupDesc: 'Eksportuj historię schowka, przypięte elementy i ustawienia do zaszyfrowanego archiwum .txa. Przywracaj w trybie scalania lub zastępowania.'
    },
    behaviour: {
      connectingDownload: 'Łączenie z serwerem pobierania...',
      connecting: 'Łączenie...',
      downloadingWithPercent: 'Pobieranie aktualizacji ({percent}%)...',
      download: 'Pobierz',
      notifyModeSubtitle: 'Tryb powiadomień · Kliknij, aby pobrać',
      newUpdateAvailable: 'Dostępna nowa aktualizacja {version}'
    },
    backup: {
      title: 'Kopia zapasowa i przywracanie (.txa)',
      desc: 'Twórz zaszyfrowane kopie zapasowe, aby zachować historię schowka i ustawienia.',
      exportBtn: 'Eksportuj kopię (.txa)',
      importBtn: 'Przywróć dane (.txa)',
      exportSuccess: 'Pomyślnie utworzono kopię ({items} elementów)',
      exportFailed: 'Nie udało się utworzyć kopii: {error}',
      importSuccess: 'Pomyślnie przywrócono {count} elementów',
      importFailed: 'Błąd przywracania: {error}',
      busyError: 'Inna operacja kopii lub przywracania jest już w toku.',
      modalTitle: 'Przywróć kopię T-Drop',
      modalDesc: 'Przejrzyj szczegóły archiwum i wybierz tryb przywracania.',
      fileLabel: 'Plik kopii:',
      dateLabel: 'Data utworzenia:',
      itemsLabel: 'Elementy:',
      imagesLabel: 'Obrazy:',
      modeLabel: 'Tryb przywracania:',
      modeMerge: 'Scal (Zalecane)',
      modeMergeDesc: 'Zachowaj bieżące elementy i dodaj nowe z kopii zapasowej.',
      modeOverwrite: 'Zastąp wszystko',
      modeOverwriteDesc: 'Całkowicie zastąp bieżącą historię i ustawienia danymi z kopii.',
      confirmRestore: 'Potwierdź przywrócenie',
      cancel: 'Anuluj',
      restoring: 'Przywracanie...',
      autoDetectedTitle: 'Wykryto plik kopii zapasowej',
      previewTitle: 'Podgląd kopii zapasowej',
      itemsUnit: 'elementów'
    }
  },
  nl: {
    onboarding: {
      backupTitle: 'Back-up en herstel (.txa)',
      backupDesc: 'Exporteer klembordgeschiedenis, vastgemaakte items en instellingen naar een versleuteld .txa-archief.'
    },
    behaviour: {
      connectingDownload: 'Verbinden met downloadserver...',
      connecting: 'Verbinden...',
      downloadingWithPercent: 'Update downloaden ({percent}%)...',
      download: 'Downloaden',
      notifyModeSubtitle: 'Meldingsmodus · Klik om te downloaden',
      newUpdateAvailable: 'Nieuwe update beschikbaar {version}'
    },
    backup: {
      title: 'Back-up en herstel (.txa)',
      desc: 'Maak versleutelde back-ups om klemborditems, afbeeldingen en instellingen te behouden.',
      exportBtn: 'Back-up exporteren (.txa)',
      importBtn: 'Gegevens herstellen (.txa)',
      exportSuccess: 'Back-up succesvol aangemaakt ({items} items)',
      exportFailed: 'Kan back-up niet maken: {error}',
      importSuccess: '{count} items succesvol hersteld',
      importFailed: 'Herstel mislukt: {error}',
      busyError: 'Er is al een back-up- of herstelbewerking bezig.',
      modalTitle: 'T-Drop back-up herstellen',
      modalDesc: 'Bekijk de archiefgegevens en kies hoe u gegevens wilt herstellen.',
      fileLabel: 'Back-upbestand:',
      dateLabel: 'Aanmaakdatum:',
      itemsLabel: 'Items:',
      imagesLabel: 'Afbeeldingen:',
      modeLabel: 'Herstelmodus:',
      modeMerge: 'Samenvoegen (Aanbevolen)',
      modeMergeDesc: 'Huidige items behouden en nieuwe toevoegen uit back-up.',
      modeOverwrite: 'Alles overschrijven',
      modeOverwriteDesc: 'Huidige geschiedenis en instellingen volledig vervangen door back-up.',
      confirmRestore: 'Herstel bevestigen',
      cancel: 'Annuleren',
      restoring: 'Herstellen...',
      autoDetectedTitle: 'Back-upbestand gedetecteerd',
      previewTitle: 'Voorbeeld van back-up',
      itemsUnit: 'items'
    }
  },
  sv: {
    onboarding: {
      backupTitle: 'Säkerhetskopiering och återställning (.txa)',
      backupDesc: 'Exportera urklippshistorik, fästa objekt och inställningar till ett krypterat .txa-arkiv.'
    },
    behaviour: {
      connectingDownload: 'Ansluter till nedladdningsserver...',
      connecting: 'Ansluter...',
      downloadingWithPercent: 'Laddar ner uppdatering ({percent}%)...',
      download: 'Ladda ner',
      notifyModeSubtitle: 'Aviseringsläge · Klicka för att ladda ner',
      newUpdateAvailable: 'Ny uppdatering tillgänglig {version}'
    },
    backup: {
      title: 'Säkerhetskopiering och återställning (.txa)',
      desc: 'Skapa krypterade säkerhetskopior för att bevara urklippsobjekt och inställningar.',
      exportBtn: 'Exportera säkerhetskopia (.txa)',
      importBtn: 'Återställ data (.txa)',
      exportSuccess: 'Säkerhetskopia skapad ({items} objekt)',
      exportFailed: 'Kunde inte skapa säkerhetskopia: {error}',
      importSuccess: '{count} objekt har återställts',
      importFailed: 'Återställning misslyckades: {error}',
      busyError: 'En annan säkerhetskopiering eller återställning pågår redan.',
      modalTitle: 'Återställ T-Drop säkerhetskopia',
      modalDesc: 'Granska arkivinformationen och välj återställningsläge.',
      fileLabel: 'Säkerhetskopia:',
      dateLabel: 'Skapad den:',
      itemsLabel: 'Objekt:',
      imagesLabel: 'Bilder:',
      modeLabel: 'Återställningsläge:',
      modeMerge: 'Slå samman (Rekommenderas)',
      modeMergeDesc: 'Behåll befintliga objekt och lägg till nya från säkerhetskopian.',
      modeOverwrite: 'Skriv över allt',
      modeOverwriteDesc: 'Ersätt historik och inställningar helt med säkerhetskopian.',
      confirmRestore: 'Bekräfta återställning',
      cancel: 'Avbryt',
      restoring: 'Återställer...',
      autoDetectedTitle: 'Säkerhetskopia upptäckt',
      previewTitle: 'Förhandsgranskning av säkerhetskopia',
      itemsUnit: 'objekt'
    }
  },
  id: {
    onboarding: {
      backupTitle: 'Cadangan & Pemulihan Arsip (.txa)',
      backupDesc: 'Ekspor riwayat papan klip, item yang disematkan, dan pengaturan ke arsip .txa terenkripsi. Pulihkan kapan saja dengan mode Gabung atau Timpa.'
    },
    behaviour: {
      connectingDownload: 'Menghubungkan ke server unduhan...',
      connecting: 'Menghubungkan...',
      downloadingWithPercent: 'Mengunduh pembaruan ({percent}%)...',
      download: 'Unduh',
      notifyModeSubtitle: 'Mode pemberitahuan · Klik untuk mengunduh',
      newUpdateAvailable: 'Pembaruan baru tersedia {version}'
    },
    backup: {
      title: 'Cadangan & Pemulihan (.txa)',
      desc: 'Buat cadangan terenkripsi untuk mengamankan item papan klip, gambar, dan pengaturan saat instal ulang Windows.',
      exportBtn: 'Ekspor Cadangan (.txa)',
      importBtn: 'Pulihkan Data (.txa)',
      exportSuccess: 'Cadangan terenkripsi berhasil dibuat ({items} item)',
      exportFailed: 'Gagal membuat cadangan: {error}',
      importSuccess: '{count} item berhasil dipulihkan',
      importFailed: 'Gagal memulihkan: {error}',
      busyError: 'Operasi pencadangan atau pemulihan lain sedang berlangsung.',
      modalTitle: 'Pulihkan Cadangan T-Drop',
      modalDesc: 'Tinjau detail arsip dan pilih cara pemulihan data.',
      fileLabel: 'File Cadangan:',
      dateLabel: 'Tanggal Dibuat:',
      itemsLabel: 'Item:',
      imagesLabel: 'Gambar:',
      modeLabel: 'Mode Pemulihan:',
      modeMerge: 'Gabung (Disarankan)',
      modeMergeDesc: 'Pertahankan item saat ini dan tambahkan item baru dari cadangan.',
      modeOverwrite: 'Timpa Semua',
      modeOverwriteDesc: 'Gantikan seluruh riwayat dan pengaturan dengan data cadangan.',
      confirmRestore: 'Konfirmasi Pemulihan',
      cancel: 'Batal',
      restoring: 'Memulihkan...',
      autoDetectedTitle: 'File Cadangan Terdeteksi',
      previewTitle: 'Pratinjau Cadangan',
      itemsUnit: 'item'
    }
  },
  uk: {
    onboarding: {
      backupTitle: 'Резервне копіювання та відновлення (.txa)',
      backupDesc: 'Експортуйте історію буфера обміну, закріплені елементи та налаштування у зашифрований архів .txa.'
    },
    behaviour: {
      connectingDownload: 'Підключення до сервера завантаження...',
      connecting: 'Підключення...',
      downloadingWithPercent: 'Завантаження оновлення ({percent}%)...',
      download: 'Завантажити',
      notifyModeSubtitle: 'Режим сповіщення · Натисніть для завантаження',
      newUpdateAvailable: 'Доступне нове оновлення {version}'
    },
    backup: {
      title: 'Резервне копіювання та відновлення (.txa)',
      desc: 'Створюйте зашифровані резервні копії для збереження історії та налаштувань під час перевстановлення Windows.',
      exportBtn: 'Експорт копії (.txa)',
      importBtn: 'Відновити дані (.txa)',
      exportSuccess: 'Резервну копію успішно створено ({items} елементів)',
      exportFailed: 'Не вдалося створити копію: {error}',
      importSuccess: 'Успішно відновлено {count} елементів',
      importFailed: 'Помилка відновлення: {error}',
      busyError: 'Інша операція резервного копіювання або відновлення вже виконується.',
      modalTitle: 'Відновлення резервної копії T-Drop',
      modalDesc: 'Перегляньте деталі архіву та виберіть режим відновлення.',
      fileLabel: 'Файл копії:',
      dateLabel: 'Дата створення:',
      itemsLabel: 'Елементи:',
      imagesLabel: 'Зображення:',
      modeLabel: 'Режим відновлення:',
      modeMerge: 'Об’єднати (Рекомендовано)',
      modeMergeDesc: 'Зберегти поточні елементи та додати нові з копії.',
      modeOverwrite: 'Перезаписати все',
      modeOverwriteDesc: 'Повністю замінити поточну історію та налаштування копією.',
      confirmRestore: 'Підтвердити відновлення',
      cancel: 'Скасувати',
      restoring: 'Відновлення...',
      autoDetectedTitle: 'Виявлено файл резервної копії',
      previewTitle: 'Попередній перегляд копії',
      itemsUnit: 'елементів'
    }
  },
  el: {
    onboarding: {
      backupTitle: 'Αντίγραφα ασφαλείας & Επαναφορά (.txa)',
      backupDesc: 'Εξαγάγετε το ιστορικό προχείρου, τα καρφιτσωμένα στοιχεία και τις ρυθμίσεις σε κρυπτογραφημένο αρχείο .txa.'
    },
    behaviour: {
      connectingDownload: 'Σύνδεση με τον διακομιστή λήψης...',
      connecting: 'Σύνδεση...',
      downloadingWithPercent: 'Λήψη ενημέρωσης ({percent}%)...',
      download: 'Λήψη',
      notifyModeSubtitle: 'Λειτουργία ειδοποίησης · Κάντε κλικ για λήψη',
      newUpdateAvailable: 'Νέα ενημέρωση διαθέσιμη {version}'
    },
    backup: {
      title: 'Αντίγραφα ασφαλείας & Επαναφορά (.txa)',
      desc: 'Δημιουργήστε κρυπτογραφημένα αντίγραφα ασφαλείας για να διατηρήσετε στοιχεία και ρυθμίσεις.',
      exportBtn: 'Εξαγωγή αντιγράφου (.txa)',
      importBtn: 'Επαναφορά δεδομένων (.txa)',
      exportSuccess: 'Επιτυχής δημιουργία αντιγράφου ({items} στοιχεία)',
      exportFailed: 'Αποτυχία δημιουργίας αντιγράφου: {error}',
      importSuccess: 'Επιτυχής επαναφορά {count} στοιχείων',
      importFailed: 'Αποτυχία επαναφοράς: {error}',
      busyError: 'Μια άλλη λειτουργία αντιγράφου ή επαναφοράς βρίσκεται σε εξέλιξη.',
      modalTitle: 'Επαναφορά αντιγράφου T-Drop',
      modalDesc: 'Ελέγξτε τις λεπτομέρειες του αρχείου και επιλέξτε τρόπο επαναφοράς.',
      fileLabel: 'Αρχείο αντιγράφου:',
      dateLabel: 'Ημερομηνία δημιουργίας:',
      itemsLabel: 'Στοιχεία:',
      imagesLabel: 'Εικόνες:',
      modeLabel: 'Λειτουργία επαναφοράς:',
      modeMerge: 'Συγχώνευση (Συνιστάται)',
      modeMergeDesc: 'Διατήρηση τρεχόντων στοιχείων και προσθήκη νέων από το αντίγραφο.',
      modeOverwrite: 'Αντικατάσταση όλων',
      modeOverwriteDesc: 'Πλήρης αντικατάσταση ιστορικού και ρυθμίσεων με το αντίγραφο.',
      confirmRestore: 'Επιβεβαίωση επαναφοράς',
      cancel: 'Ακύρωση',
      restoring: 'Επαναφορά...',
      autoDetectedTitle: 'Εντοπίστηκε αρχείο αντιγράφου',
      previewTitle: 'Προεπισκόπηση αντιγράφου',
      itemsUnit: 'στοιχεία'
    }
  },
  cs: {
    onboarding: {
      backupTitle: 'Zálohování a obnovení (.txa)',
      backupDesc: 'Exportujte historii schránky, připnuté položky a nastavení do šifrovaného archivu .txa.'
    },
    behaviour: {
      connectingDownload: 'Připojování ke stahovacímu serveru...',
      connecting: 'Připojování...',
      downloadingWithPercent: 'Stahování aktualizace ({percent}%)...',
      download: 'Stáhnout',
      notifyModeSubtitle: 'Režim oznámení · Klikněte pro stažení',
      newUpdateAvailable: 'K dispozici je nová aktualizace {version}'
    },
    backup: {
      title: 'Zálohování a obnovení (.txa)',
      desc: 'Vytvářejte šifrované zálohy pro zachování položek schránky a nastavení při přeinstalaci Windows.',
      exportBtn: 'Exportovat zálohu (.txa)',
      importBtn: 'Obnovit data (.txa)',
      exportSuccess: 'Záloha úspěšně vytvořena ({items} položek)',
      exportFailed: 'Vytvoření zálohy se nezdařilo: {error}',
      importSuccess: 'Úspěšně obnoveno {count} položek',
      importFailed: 'Obnovení se nezdařilo: {error}',
      busyError: 'Již probíhá jiná operace zálohování nebo obnovení.',
      modalTitle: 'Obnovit zálohu T-Drop',
      modalDesc: 'Zkontrolujte podrobnosti archivu a vyberte režim obnovení.',
      fileLabel: 'Záložní soubor:',
      dateLabel: 'Datum vytvoření:',
      itemsLabel: 'Položky:',
      imagesLabel: 'Obrázky:',
      modeLabel: 'Režim obnovení:',
      modeMerge: 'Sloučit (Doporučeno)',
      modeMergeDesc: 'Ponechat stávající položky a přidat nové ze zálohy.',
      modeOverwrite: 'Přepsat vše',
      modeOverwriteDesc: 'Zcela nahradit aktuální historii a nastavení zálohou.',
      confirmRestore: 'Potvrdit obnovení',
      cancel: 'Zrušit',
      restoring: 'Obnovování...',
      autoDetectedTitle: 'Zjištěn záložní soubor',
      previewTitle: 'Náhled zálohy',
      itemsUnit: 'položek'
    }
  },
  ro: {
    onboarding: {
      backupTitle: 'Copie de rezervă și restaurare (.txa)',
      backupDesc: 'Exportați istoricul clipboard-ului, elementele fixate și setările într-o arhivă .txa criptată.'
    },
    behaviour: {
      connectingDownload: 'Conectare la serverul de descărcare...',
      connecting: 'Conectare...',
      downloadingWithPercent: 'Descărcare actualizare ({percent}%)...',
      download: 'Descarcă',
      notifyModeSubtitle: 'Mod notificare · Faceți clic pentru a descărca',
      newUpdateAvailable: 'Actualizare nouă disponibilă {version}'
    },
    backup: {
      title: 'Copie de rezervă și restaurare (.txa)',
      desc: 'Creați copii de rezervă criptate pentru a păstra elementele din clipboard și setările.',
      exportBtn: 'Exportă copie (.txa)',
      importBtn: 'Restaurează date (.txa)',
      exportSuccess: 'Copie de rezervă creată cu succes ({items} elemente)',
      exportFailed: 'Crearea copiei a eșuat: {error}',
      importSuccess: '{count} elemente restaurate cu succes',
      importFailed: 'Restaurarea a eșuat: {error}',
      busyError: 'O altă operațiune de backup sau restaurare este deja în curs.',
      modalTitle: 'Restaurare copie T-Drop',
      modalDesc: 'Examinați detaliile arhivei și alegeți modul de restaurare.',
      fileLabel: 'Fișier copie:',
      dateLabel: 'Data creării:',
      itemsLabel: 'Elemente:',
      imagesLabel: 'Imagini:',
      modeLabel: 'Mod restaurare:',
      modeMerge: 'Îmbinare (Recomandat)',
      modeMergeDesc: 'Păstrați elementele curente și adăugați cele noi din copie.',
      modeOverwrite: 'Suprapune tot',
      modeOverwriteDesc: 'Înlocuiți complet istoricul și setările cu datele din copie.',
      confirmRestore: 'Confirmă restaurarea',
      cancel: 'Anulează',
      restoring: 'Se restaurează...',
      autoDetectedTitle: 'Fișier de rezervă detectat',
      previewTitle: 'Previzualizare copie de rezervă',
      itemsUnit: 'elemente'
    }
  },
  hu: {
    onboarding: {
      backupTitle: 'Biztonsági mentés és visszaállítás (.txa)',
      backupDesc: 'Exportálja vágólap-előzményeit, kitűzött elemeit és beállításait egy titkosított .txa archívumba.'
    },
    behaviour: {
      connectingDownload: 'Csatlakozás a letöltési kiszolgálóhoz...',
      connecting: 'Csatlakozás...',
      downloadingWithPercent: 'Frissítés letöltése ({percent}%)...',
      download: 'Letöltés',
      notifyModeSubtitle: 'Értesítési mód · Kattintson a letöltéshez',
      newUpdateAvailable: 'Új frissítés érhető el {version}'
    },
    backup: {
      title: 'Biztonsági mentés és visszaállítás (.txa)',
      desc: 'Hozzon létre titkosított biztonsági mentéseket a vágólap és a beállítások megőrzéséhez.',
      exportBtn: 'Mentés exportálása (.txa)',
      importBtn: 'Adatok visszaállítása (.txa)',
      exportSuccess: 'Biztonsági mentés sikeresen létrehozva ({items} elem)',
      exportFailed: 'Nem sikerült létrehozni a mentést: {error}',
      importSuccess: '{count} elem sikeresen visszaállítva',
      importFailed: 'Visszaállítás sikertelen: {error}',
      busyError: 'Egy másik mentési vagy visszaállítási művelet már folyamatban van.',
      modalTitle: 'T-Drop mentés visszaállítása',
      modalDesc: 'Tekintse át az archívum részleteit és válassza ki a visszaállítási módot.',
      fileLabel: 'Mentési fájl:',
      dateLabel: 'Létrehozás dátuma:',
      itemsLabel: 'Elemek száma:',
      imagesLabel: 'Képek:',
      modeLabel: 'Visszaállítási mód:',
      modeMerge: 'Egyesítés (Ajánlott)',
      modeMergeDesc: 'Meglévő elemek megőrzése és az újak hozzáadása a mentésből.',
      modeOverwrite: 'Minden felülírása',
      modeOverwriteDesc: 'A jelenlegi előzmények és beállítások teljes felülírása a mentéssel.',
      confirmRestore: 'Visszaállítás megerősítése',
      cancel: 'Mégse',
      restoring: 'Visszaállítás folyamatban...',
      autoDetectedTitle: 'Biztonsági mentési fájl észlelve',
      previewTitle: 'Mentés előnézete',
      itemsUnit: 'elem'
    }
  },
  da: {
    onboarding: {
      backupTitle: 'Sikkerhedskopiering og gendannelse (.txa)',
      backupDesc: 'Eksportér udklipsholderhistorik, fastgjorte elementer og indstillinger til et krypteret .txa-arkiv.'
    },
    behaviour: {
      connectingDownload: 'Opretter forbindelse til downloadserver...',
      connecting: 'Opretter forbindelse...',
      downloadingWithPercent: 'Downloader opdatering ({percent}%)...',
      download: 'Download',
      notifyModeSubtitle: 'Underretningstilstand · Klik for at downloade',
      newUpdateAvailable: 'Ny opdatering tilgængelig {version}'
    },
    backup: {
      title: 'Sikkerhedskopiering og gendannelse (.txa)',
      desc: 'Opret krypterede sikkerhedskopier for at bevare udklipsholder og indstillinger ved geninstallation af Windows.',
      exportBtn: 'Eksportér sikkerhedskopi (.txa)',
      importBtn: 'Gendan data (.txa)',
      exportSuccess: 'Sikkerhedskopi oprettet med succes ({items} elementer)',
      exportFailed: 'Kunne ikke oprette sikkerhedskopi: {error}',
      importSuccess: '{count} elementer blev gendannet',
      importFailed: 'Gendannelse mislykkedes: {error}',
      busyError: 'En anden sikkerhedskopiering eller gendannelse er allerede i gang.',
      modalTitle: 'Gendan T-Drop sikkerhedskopi',
      modalDesc: 'Gennemgå arkivoplysningerne og vælg gendannelsestilstand.',
      fileLabel: 'Sikkerhedskopifil:',
      dateLabel: 'Oprettelsesdato:',
      itemsLabel: 'Elementer:',
      imagesLabel: 'Billeder:',
      modeLabel: 'Gendannelsestilstand:',
      modeMerge: 'Flet (Anbefalet)',
      modeMergeDesc: 'Bevar nuværende elementer og tilføj nye fra sikkerhedskopien.',
      modeOverwrite: 'Overskriv alle',
      modeOverwriteDesc: 'Erstat nuværende historik og indstillinger fuldstændigt med sikkerhedskopien.',
      confirmRestore: 'Bekræft gendannelse',
      cancel: 'Annuller',
      restoring: 'Gendanner...',
      autoDetectedTitle: 'Sikkerhedskopifil fundet',
      previewTitle: 'Forhåndsvisning af sikkerhedskopi',
      itemsUnit: 'elementer'
    }
  },
  fi: {
    onboarding: {
      backupTitle: 'Varmuuskopiointi ja palautus (.txa)',
      backupDesc: 'Vie leikepöytähistoria, kiinnitetyt kohteet ja asetukset salattuun .txa-arkistoon.'
    },
    behaviour: {
      connectingDownload: 'Yhdistetään latauspalvelimeen...',
      connecting: 'Yhdistetään...',
      downloadingWithPercent: 'Ladataan päivitystä ({percent}%)...',
      download: 'Lataa',
      notifyModeSubtitle: 'Ilmoitustila · Lataa napsauttamalla',
      newUpdateAvailable: 'Uusi päivitys saatavilla {version}'
    },
    backup: {
      title: 'Varmuuskopiointi ja palautus (.txa)',
      desc: 'Luo salattuja varmuuskopioita leikepöydän ja asetusten säilyttämiseksi Windowsin uudelleenasennuksessa.',
      exportBtn: 'Vie varmuuskopio (.txa)',
      importBtn: 'Palauta tiedot (.txa)',
      exportSuccess: 'Varmuuskopio luotu onnistuneesti ({items} kohdetta)',
      exportFailed: 'Varmuuskopion luonti epäonnistui: {error}',
      importSuccess: '{count} kohdetta palautettu onnistuneesti',
      importFailed: 'Palautus epäonnistui: {error}',
      busyError: 'Toinen varmuuskopiointi tai palautus on jo käynnissä.',
      modalTitle: 'Palauta T-Drop-varmuuskopio',
      modalDesc: 'Tarkista arkiston tiedot ja valitse palautustila.',
      fileLabel: 'Varmuuskopiotiedosto:',
      dateLabel: 'Luontipäivämäärä:',
      itemsLabel: 'Kohteet:',
      imagesLabel: 'Kuvat:',
      modeLabel: 'Palautustila:',
      modeMerge: 'Yhdistä (Suositus)',
      modeMergeDesc: 'Säilytä nykyiset kohteet ja lisää uudet varmuuskopiosta.',
      modeOverwrite: 'Korvaa kaikki',
      modeOverwriteDesc: 'Korvaa nykyinen historia ja asetukset kokonaan varmuuskopiolla.',
      confirmRestore: 'Vahvista palautus',
      cancel: 'Peruuta',
      restoring: 'Palautetaan...',
      autoDetectedTitle: 'Varmuuskopiotiedosto havaittu',
      previewTitle: 'Varmuuskopion esikatselu',
      itemsUnit: 'kohdetta'
    }
  },
  th: {
    onboarding: {
      backupTitle: 'สำรองและกู้คืนข้อมูล (.txa)',
      backupDesc: 'ส่งออกประวัติคลิปบอร์ด รายการที่ปักหมุด และการตั้งค่าไปยังไฟล์ .txa ที่เข้ารหัสอย่างปลอดภัย'
    },
    behaviour: {
      connectingDownload: 'กำลังเชื่อมต่อกับเซิร์ฟเวอร์ดาวน์โหลด...',
      connecting: 'กำลังเชื่อมต่อ...',
      downloadingWithPercent: 'กำลังดาวน์โหลดการอัปเดต ({percent}%)...',
      download: 'ดาวน์โหลด',
      notifyModeSubtitle: 'โหมดการแจ้งเตือน · คลิกเพื่อดาวน์โหลด',
      newUpdateAvailable: 'มีการอัปเดตใหม่ {version}'
    },
    backup: {
      title: 'สำรองและกู้คืนข้อมูล (.txa)',
      desc: 'สร้างข้อมูลสำรองที่เข้ารหัสเพื่อรักษาประวัติคลิปบอร์ดและรูปภาพเมื่อติดตั้ง Windows ใหม่',
      exportBtn: 'ส่งออกข้อมูลสำรอง (.txa)',
      importBtn: 'กู้คืนข้อมูล (.txa)',
      exportSuccess: 'สร้างข้อมูลสำรองสำเร็จ ({items} รายการ)',
      exportFailed: 'สร้างข้อมูลสำรองไม่สำเร็จ: {error}',
      importSuccess: 'กู้คืนข้อมูลสำเร็จ {count} รายการ',
      importFailed: 'การกู้คืนล้มเหลว: {error}',
      busyError: 'กำลังดำเนินการสำรองหรือกู้คืนข้อมูลอื่นอยู่',
      modalTitle: 'กู้คืนข้อมูลสำรอง T-Drop',
      modalDesc: 'ตรวจสอบรายละเอียดและเลือกวิธีการกู้คืนข้อมูล',
      fileLabel: 'ไฟล์สำรอง:',
      dateLabel: 'วันที่สร้าง:',
      itemsLabel: 'จำนวนรายการ:',
      imagesLabel: 'รูปภาพ:',
      modeLabel: 'โหมดการกู้คืน:',
      modeMerge: 'รวมข้อมูล (แนะนำ)',
      modeMergeDesc: 'เก็บรายการปัจจุบันไว้และเพิ่มรายการใหม่จากไฟล์สำรอง',
      modeOverwrite: 'เขียนทับทั้งหมด',
      modeOverwriteDesc: 'แทนที่ประวัติและการตั้งค่าปัจจุบันทั้งหมดด้วยข้อมูลสำรอง',
      confirmRestore: 'ยืนยันการกู้คืน',
      cancel: 'ยกเลิก',
      restoring: 'กำลังกู้คืน...',
      autoDetectedTitle: 'ตรวจพบไฟล์สำรอง',
      previewTitle: 'ดูตัวอย่างข้อมูลสำรอง',
      itemsUnit: 'รายการ'
    }
  },
  he: {
    onboarding: {
      backupTitle: 'גיבוי ושחזור ארכיון (.txa)',
      backupDesc: 'ייצא את היסטוריית לוח הגזירים, פריטים מוצמדים והגدرות לקובץ .txa מוצפן ומאובטח.'
    },
    behaviour: {
      connectingDownload: 'מתחבר לשרת ההורדות...',
      connecting: 'מתחבר...',
      downloadingWithPercent: 'מוריד עדכון ({percent}%)...',
      download: 'הורד',
      notifyModeSubtitle: 'מצב התראה · לחץ להורדה',
      newUpdateAvailable: 'עדכון חדש זמין {version}'
    },
    backup: {
      title: 'גיבוי ושחזור (.txa)',
      desc: 'צור גיבויים מוצפנים לשמירה על פריטי לוח הגזירים וההגדרות בעת התקנה מחדש של Windows.',
      exportBtn: 'ייצא גיבוי (.txa)',
      importBtn: 'שחזר נתונים (.txa)',
      exportSuccess: 'הגיבוי המוצפן נוצר בהצלחה ({items} פריטים)',
      exportFailed: 'יצירת הגיבוי נכשלה: {error}',
      importSuccess: '{count} פריטים שוחזרו בהצלחה',
      importFailed: 'השחזור נכשל: {error}',
      busyError: 'פעולת גיבוי או שחזור אחרת כבר מתבצעת.',
      modalTitle: 'שחזור גיבוי T-Drop',
      modalDesc: 'בדוק את פרטי הארכיון ובחר כיצד לשחזר את הנתונים.',
      fileLabel: 'קובץ גיבוי:',
      dateLabel: 'תאריך יצירה:',
      itemsLabel: 'פריטים:',
      imagesLabel: 'תמונות:',
      modeLabel: 'מצב שחזור:',
      modeMerge: 'מיזוג (מומלץ)',
      modeMergeDesc: 'שמור על הפריטים הנוכחיים והוסף פריטים חדשים מהגיבוי.',
      modeOverwrite: 'דרוס הכל',
      modeOverwriteDesc: 'החלף לחלוטין את ההיסטוריה וההגדרות הנוכחיות בנתוני הגיבוי.',
      confirmRestore: 'אשר שחזור',
      cancel: 'ביטול',
      restoring: 'משחזר...',
      autoDetectedTitle: 'זוהה קובץ גיבוי',
      previewTitle: 'תצוגה מקדימה של הגיבוי',
      itemsUnit: 'פריטים'
    }
  },
  no: {
    onboarding: {
      backupTitle: 'Sikkerhetskopiering og gjenoppretting (.txa)',
      backupDesc: 'Eksporter utklippstavlehistorikk, festede elementer og innstillinger til et kryptert .txa-arkiv.'
    },
    behaviour: {
      connectingDownload: 'Kobler til nedlastingsserver...',
      connecting: 'Kobler til...',
      downloadingWithPercent: 'Laster ned oppdatering ({percent}%)...',
      download: 'Last ned',
      notifyModeSubtitle: 'Varslingsmodus · Klikk for å laste ned',
      newUpdateAvailable: 'Ny oppdatering tilgjengelig {version}'
    },
    backup: {
      title: 'Sikkerhetskopiering og gjenoppretting (.txa)',
      desc: 'Opprett krypterte sikkerhetskopier for å bevare utklipp og innstillinger ved reinstallering av Windows.',
      exportBtn: 'Eksporter sikkerhetskopi (.txa)',
      importBtn: 'Gjenopprett data (.txa)',
      exportSuccess: 'Sikkerhetskopi opprettet ({items} elementer)',
      exportFailed: 'Kunne ikke opprette sikkerhetskopi: {error}',
      importSuccess: '{count} elementer ble gjenopprettet',
      importFailed: 'Gjenoppretting mislyktes: {error}',
      busyError: 'En annen sikkerhetskopiering eller gjenoppretting pågår allerede.',
      modalTitle: 'Gjenopprett T-Drop sikkerhetskopi',
      modalDesc: 'Se gjennom arkivdetaljene og velg gjenopprettingsmodus.',
      fileLabel: 'Sikkerhetskopifil:',
      dateLabel: 'Opprettet dato:',
      itemsLabel: 'Elementer:',
      imagesLabel: 'Bilder:',
      modeLabel: 'Gjenopprettingsmodus:',
      modeMerge: 'Slå sammen (Anbefalt)',
      modeMergeDesc: 'Behold gjeldende elementer og legg til nye fra sikkerhetskopien.',
      modeOverwrite: 'Overskriv alt',
      modeOverwriteDesc: 'Erstatt gjeldende historikk og innstillinger helt med sikkerhetskopien.',
      confirmRestore: 'Bekreft gjenoppretting',
      cancel: 'Avbryt',
      restoring: 'Gjenoppretter...',
      autoDetectedTitle: 'Sikkerhetskopifil oppdaget',
      previewTitle: 'Forhåndsvisning av sikkerhetskopi',
      itemsUnit: 'elementer'
    }
  }
};

// Map code to keys
const codeMap = {
  'zh-CN': 'zhCN',
  'zh-TW': 'zhTW'
};

const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

for (const file of allFiles) {
  const code = file.replace('.json', '');
  const mappedKey = codeMap[code] || code;
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const src = featureTranslations[mappedKey] || featureTranslations.en;

  // 1. Ensure onboarding keys
  data.onboarding = data.onboarding || {};
  data.onboarding.backupTitle = src.onboarding.backupTitle;
  data.onboarding.backupDesc = src.onboarding.backupDesc;

  // 2. Ensure behaviour keys
  data.behaviour = data.behaviour || {};
  data.behaviour.connectingDownload = src.behaviour.connectingDownload;
  data.behaviour.connecting = src.behaviour.connecting;
  data.behaviour.downloadingWithPercent = src.behaviour.downloadingWithPercent;
  data.behaviour.download = src.behaviour.download;
  data.behaviour.notifyModeSubtitle = src.behaviour.notifyModeSubtitle;
  data.behaviour.newUpdateAvailable = src.behaviour.newUpdateAvailable;

  // 3. Ensure backup keys
  data.backup = data.backup || {};
  for (const [k, v] of Object.entries(src.backup)) {
    data.backup[k] = v;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

console.log(`Successfully synchronized all ${allFiles.length} language files in t-drop-translations with full translations!`);
