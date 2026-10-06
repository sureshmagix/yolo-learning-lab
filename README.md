# YOLO Learning Lab 🚀

An interactive, visual, buildless educational laboratory for mastering **YOLO object detection**, **bounding box normalization math**, **multi-object tracking (ByteTrack)**, and **ANPR (Automatic Number Plate Recognition)** pipelines.

🌐 **Live Demo on GitHub Pages**: [https://sureshmagix.github.io/yolo-learning-lab/](https://sureshmagix.github.io/yolo-learning-lab/)

---

## 🌟 Key Features & Improvements

### 1. Interactive Annotation Studio with Easy Box Controls
* **8-Point Handle Resizing**: Grab any corner (`nw`, `ne`, `se`, `sw`) or edge (`n`, `e`, `s`, `w`) handle to easily adjust bounding boxes.
* **Click & Drag to Move**: Click anywhere inside the box to reposition it across the image without resizing.
* **Draw from Scratch**: Click and drag outside the box to immediately draw a new box with rubberband feedback.
* **Quick-Snap Presets**:
  * 🎯 **Snap Plate**: Automatically fits the license plate (`410, 585` to `590, 650`).
  * 🚗 **Snap Vehicle**: Automatically fits the entire vehicle body.
  * ↔ **Center Box**: Centers the bounding box within current image dimensions.
* **High-Fidelity Vector Art**: High-resolution vector vehicle illustration with headlights, chrome grille, windshield reflections, and an authentic embossed license plate (`TN 09 AB 1234`).
* **Custom Image Upload**: Upload any photo from your local disk; coordinates and normalization automatically calculate against the image's original dimensions.

### 2. Live Color-Coded YOLO Label Decoder
* Color-coded chips representing the 5 YOLO values:
  * `class_id` (Indigo)
  * `x_center` (Emerald)
  * `y_center` (Cyan)
  * `width` (Amber)
  * `height` (Rose)
* Real-time step-by-step arithmetic equations showing exact division and fractional conversion:
  $$\text{cx} = \frac{(x_1 + x_2) / 2}{W}, \quad \text{cy} = \frac{(y_1 + y_2) / 2}{H}$$
  $$\text{w} = \frac{x_2 - x_1}{W}, \quad \text{h} = \frac{y_2 - y_1}{H}$$
* One-click **Download `.txt`** and **Copy to Clipboard**.

### 3. Aspect-Preserving Letterbox Preprocessing Simulator
* Simulates how neural network backbones (e.g. `640 × 640`, `320 × 320`) pad non-square aspect ratios with grey bars without distorting object shapes.
* Displays dynamic scale factors $r$, padding per axis $(px, py)$, and transformed bounding box coordinates.

### 4. Multi-Object Tracking & Highway Tripwire Simulator
* Real-time canvas simulation of an approaching vehicle with ByteTrack Kalman filter motion trails.
* Virtual counting gate (tripwire at $x = 450$) that illuminates and triggers a persistent directional counter without duplicate increments.
* Scrubbing slider, play/pause controls, and frame-by-frame inspection.

### 5. Interactive End-to-End ANPR Pipeline
Clickable 6-stage architecture breakdown covering:
1. **High-Speed Optical Capture** (Global shutter, 850nm IR illumination).
2. **Vehicle Detection & Tracking** (YOLO26 / YOLO11 + ByteTrack Kalman filters).
3. **Plate Localization** (Two-stage detector on vehicle crops).
4. **Warp & Rectification** (Spatial Transformer Networks & 4-point homography).
5. **Character Recognition** (PaddleOCR / CRNN with CTC Loss).
6. **Validation & Business Logic** (Temporal majority voting & regional Regex filters).

---

## 🛠️ Architecture & Training Workflow

### Ultralytics Dataset Structure
```
dataset/
├── dataset.yaml
├── images/
│   ├── train/
│   ├── val/
│   └── test/
└── labels/
    ├── train/
    ├── val/
    └── test/
```

### Dataset YAML (`dataset.yaml`)
```yaml
path: /path/to/dataset
train: images/train
val: images/val
test: images/test
names:
  0: license_plate
```

### Train YOLO26 / YOLO11 on CLI
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
python -m pip install ultralytics

# Train Nano Plate Detector
yolo detect train model=yolo26n.pt data=dataset.yaml epochs=50 imgsz=640 batch=16

# Validate Model
yolo detect val model=runs/detect/train/weights/best.pt data=dataset.yaml split=test

# Run Tracking on Video
yolo track model=runs/detect/train/weights/best.pt source=traffic.mp4 tracker=bytetrack.yaml
```

---

## 🚀 GitHub Pages Deployment

1. Go to repository **Settings** → **Pages**.
2. Under **Build and deployment**:
   * **Source**: Select `Deploy from a branch`.
   * **Branch**: `main`, folder `/ (root)`.
   * Click **Save**.
3. Your site will be live at:
   `https://sureshmagix.github.io/yolo-learning-lab/`

---

## 📄 License
MIT License. Created for open computer vision education.
