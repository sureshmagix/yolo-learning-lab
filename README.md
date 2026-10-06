# YOLO Learning Lab

A buildless, interactive introduction to YOLO, annotation, model training, ANPR and tracking. Open `index.html` locally. No dependencies, account or backend are required. Uploaded images stay in the browser; nothing is transmitted by the application.

## GitHub Pages

1. Create a repository, for example `yolo-learning-lab`.
2. Extract this ZIP and upload the contents of the `yolo-learning` folder to the repository root. `index.html` must be at the root, alongside `app.js` and `assets/`.
3. Commit to `main`.
4. In Settings → Pages, select Deploy from a branch, `main`, `/ (root)`, then Save.
5. GitHub will display the published URL. For username `sureshmagix` and this repository name, the expected project URL is `https://sureshmagix.github.io/yolo-learning-lab/` (only available after deployment).

For the account-level URL `https://sureshmagix.github.io/`, use a repository named `sureshmagix.github.io` instead. Choose a repository/plan eligible for GitHub Pages. This package has not been pushed or published.

## Features

- Synthetic vehicle illustration for practising annotation.
- Draw a replacement box using mouse or touch, or edit numeric coordinates.
- Upload an image and normalize using its original dimensions.
- Choose plate/vehicle and export one YOLO label row.
- General annotation workflow and dimension-dependent examples.
- Model generation/size/task comparison, training workflow and commands.
- Scripted vehicle animation demonstrating a stable track ID and counting line.
- ANPR pipeline and links to primary documentation.

This is not an inference engine, full annotation tool or production ANPR system. It does not train or run models. The exporter supports one box per image; a real multi-object dataset needs one row per object. The lab's two-class mapping is 0: object, 1: vehicle, 2: plate; the plate-only training example uses only 0: plate.

## Training example

Use the website's dataset layout, replace the absolute path in `dataset.yaml`, collect and label your own data, then run the commands on a Python machine. GPU acceleration is recommended. Default COCO model weights have vehicle classes but no dedicated plate class. OCR training data and inference are separate from the plate detection labels.

Verification: JavaScript syntax and coordinate cases were checked. Interactive browser testing was not performed in this environment. Model training was not run; no dataset or trained weights are included.

Primary references: https://docs.ultralytics.com/datasets/detect/ ; https://docs.ultralytics.com/models/ ; https://docs.ultralytics.com/modes/track/ ; https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

Image inspector: original dimensions, aspect ratio, pixel count, box corners/centre/size/area, normalized coordinates and square letterbox scale/padding/transformed corners. Local image uploads do not run detection or OCR.
