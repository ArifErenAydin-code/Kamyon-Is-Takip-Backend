from ultralytics import YOLO
import argparse
import sys
import torch
import cv2
import numpy as np
import re
from datetime import datetime
import easyocr as ocr
from PIL import Image

# EasyOCR başlatma - İngilizce ve Türkçe dil desteği
ocr_motoru = ocr.Reader(['en', 'tr'])

def print_separator():
    print("\n" + "="*50)
    print(f"🕒 {datetime.now().strftime('%H:%M:%S')}")
    print("="*50)

def validate_number(text):
    """Tespit edilen sayının geçerli bir tonaj değeri olup olmadığını kontrol eder"""
    try:
        # Sadece sayıları al
        numbers = ''.join(filter(str.isdigit, text))
        
        # Sayı uzunluğu kontrolü (2-6 karakter arası)
        if len(numbers) < 2 or len(numbers) > 6:
            return False
            
        # Sayıya çevir
        value = int(numbers)
        
        # Mantıklı tonaj aralığı kontrolü (100kg - 50000kg)
        if value < 100 or value > 50000:
            return False
            
        return True
    except:
        return False

def extract_text_from_box(image, box):
    """Tespit edilen kutu içindeki sayıları çıkarır"""
    try:
        print("      📍 Koordinatları işleme...")
        # YOLO kutusunu al
        x1, y1, x2, y2 = map(int, box)
        
        print(f"      📏 YOLO kutu koordinatları: x1={x1}, y1={y1}, x2={x2}, y2={y2}")
        
        print("      🔍 OCR uygulanıyor...")
        
        # Tüm görüntüde OCR uygula
        results = ocr_motoru.readtext(image)
        
        best_result = None
        best_confidence = 0
        
        # Her tespit edilen metin için
        for (bbox, text, confidence) in results:
            # bbox koordinatları: [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
            text_x1 = int(min(point[0] for point in bbox))
            text_y1 = int(min(point[1] for point in bbox))
            text_x2 = int(max(point[0] for point in bbox))
            text_y2 = int(max(point[1] for point in bbox))
            
            # Tespit edilen metnin merkez noktası
            text_center_x = (text_x1 + text_x2) / 2
            text_center_y = (text_y1 + text_y2) / 2
            
            # Metin merkezi YOLO kutusunun içinde mi kontrol et
            if (x1 <= text_center_x <= x2 and y1 <= text_center_y <= y2):
                # Sadece sayıları al
                numbers = ''.join(filter(str.isdigit, text))
                
                print(f"      📝 Kutu içinde tespit edilen metin: '{text}' -> Sayılar: '{numbers}' (Güven: {confidence:.2f})")
                print(f"      📍 Metin koordinatları: x1={text_x1}, y1={text_y1}, x2={text_x2}, y2={text_y2}")
                
                # Sonucu değerlendir
                if numbers and validate_number(numbers) and confidence > best_confidence:
                    best_result = numbers
                    best_confidence = confidence
            else:
                print(f"      ⏩ Kutu dışında tespit: '{text}' (x={text_center_x:.1f}, y={text_center_y:.1f})")
        
        if best_result:
            print(f"      ✅ Sayı başarıyla tespit edildi: {best_result} (Güven: {best_confidence:.2f})")
            return best_result
            
        print("      ❌ Geçerli sayı tespit edilemedi")
        return ""
        
    except Exception as e:
        print(f"      ❌ OCR Hatası: {str(e)}")
        return ""

def print_detection(box, names, image):
    cls = int(box.cls.item())
    conf = box.conf.item()
    xyxy = box.xyxy[0].tolist()
    
    print("\n📌 TESPİT DETAYLARI:")
    print(f"   🏷️  Sınıf: {names[cls]}")
    print(f"   📊 Güven: %{conf*100:.2f}")
    print(f"   📍 Konum: [x1={xyxy[0]:.1f}, y1={xyxy[1]:.1f}, x2={xyxy[2]:.1f}, y2={xyxy[3]:.1f}]")
    
    # Tespit edilen alanın boyutları
    width = xyxy[2] - xyxy[0]
    height = xyxy[3] - xyxy[1]
    print(f"   📐 Boyut: {width:.1f}x{height:.1f} piksel")
    
    print("\n   🔍 OCR İŞLEMİ BAŞLIYOR...")
    # OCR ile metin çıkar
    text = extract_text_from_box(image, xyxy)
    if text:
        print(f"   ✅ OCR BAŞARILI - Tespit Edilen Sayı: {text}")
        # DATA: prefix'i ile Node.js'e gönder
        print(f"DATA:{cls},{conf},{','.join(map(str, xyxy))},{text}")
    else:
        print(f"   ❌ OCR BAŞARISIZ - Sayı tespit edilemedi")
        print(f"DATA:{cls},{conf},{','.join(map(str, xyxy))}")
    print("   🔍 OCR İŞLEMİ TAMAMLANDI\n")

def extract_weight(text):
    """NET AĞIRLIK değerini metinden çıkar"""
    match = re.search(r'NET\s+AĞIRLIK\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*KG', text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(',', '.'))
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, help='Path to input image')
    parser.add_argument('--weights', required=True, help='Path to weights file')
    parser.add_argument('--conf', type=float, default=0.25, help='Confidence threshold')
    args = parser.parse_args()

    try:
        print_separator()
        print("🚀 YOLO ANALİZİ BAŞLIYOR")
        print(f"📸 Görüntü: {args.source}")
        print(f"⚙️  Model: {args.weights}")
        
        # YOLO modelini yükle
        print("\n⌛ Model yükleniyor...")
        model = YOLO(args.weights)
        print("✅ Model yüklendi")

        # Görüntüyü oku
        print("\n⌛ Görüntü okunuyor...")
        image = cv2.imread(args.source)
        if image is None:
            raise ValueError("❌ Görüntü okunamadı!")
        print(f"✅ Görüntü okundu: {image.shape}")

        # Tahmin yap
        print("\n⌛ Analiz yapılıyor...")
        results = model.predict(
            source=image,
            conf=args.conf,
            iou=0.3,
            save=True,
            save_txt=True,
            show=False,
            agnostic_nms=True,
            max_det=50,
            line_thickness=2,  # Kutu çizgi kalınlığı
            hide_labels=True,  # Etiketleri gizle
            hide_conf=True     # Güven değerlerini gizle
        )
        print("✅ Analiz tamamlandı\n")

        # Sonuçları işle
        for result in results:
            boxes = result.boxes
            if len(boxes) == 0:
                print("⚠️  Hiçbir nesne tespit edilemedi!")
                continue

            print(f"\n🎯 TOPLAM {len(boxes)} TESPİT:")
            
            for i, box in enumerate(boxes, 1):
                print(f"\n--- TESPİT #{i} ---")
                print_detection(box, result.names, image)

        print("\n✨ Görselleştirme kaydedildi:")
        print("📁 runs/detect/predict/")
        print_separator()
        
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ HATA: {str(e)}", file=sys.stderr)
        print_separator()
        sys.exit(1)

if __name__ == "__main__":
    main() 