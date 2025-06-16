from ultralytics import YOLO
from multiprocessing import freeze_support

# YOLOv8s modelini yükle
def main():
    model = YOLO('yolov8s.pt')

    # Eğitimi başlat
    results = model.train(
        data='data.yaml',      # veri seti konfigürasyonu
        epochs=25,             # eğitim tur sayısı
        imgsz=800,            # görüntü boyutu
        plots=True,           # grafikleri kaydet
        device=0,             # GPU kullan (ilk GPU)
        batch=16,             # batch size (GPU için artırdık)
        save=True,            # modeli kaydet
        save_period=5,        # her 5 epoch'ta bir kaydet
        patience=10,          # early stopping
        verbose=True,         # detaylı log
        workers=8             # worker sayısını artırdık
    )

if __name__ == '__main__':
    freeze_support()
    main() 