from ultralytics import YOLO

# Yeni bir YOLOv8 modeli oluştur
model = YOLO('yolov8n.pt')  # 'n' küçük model, daha hızlı eğitim için

# Modeli GPU üzerinde eğit
results = model.train(
    data='data.yaml',        # Veri seti konfigürasyon dosyası
    epochs=100,              # Eğitim tur sayısı (GPU ile daha fazla epoch kullanabiliriz)
    imgsz=640,              # Görüntü boyutu
    batch=32,               # Batch size (GPU ile daha büyük batch kullanabiliriz)
    device='0',             # GPU kullan (ilk GPU'yu kullan)
    project='runs/train',   # Sonuçların kaydedileceği klasör
    name='exp1',            # Deney adı
    workers=8,              # Veri yükleme işçi sayısı
    optimizer='auto',       # Otomatik optimizer seçimi
    lr0=0.01,              # Başlangıç learning rate
    lrf=0.001,             # Final learning rate
    momentum=0.937,        # SGD momentum/Adam beta1
    weight_decay=0.0005,   # Optimizer weight decay
    warmup_epochs=3,       # Warmup epochs
    warmup_momentum=0.8,   # Warmup başlangıç momentum
    warmup_bias_lr=0.1,    # Warmup başlangıç bias lr
    box=7.5,               # Box loss gain
    cls=0.5,               # Cls loss gain
    dfl=1.5,               # DFL loss gain
    plots=True,            # Eğitim grafikleri
    save=True,             # Modeli kaydet
    save_period=10,        # Her 10 epoch'ta bir kaydet
    patience=50            # Early stopping patience
) 