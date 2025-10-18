# Quick venv repair/help for Windows if pip complains about "Unable to create process" or wrong user paths.
# Run this (or read the printed commands) from a working Python installation.
def venv_troubleshoot():
    msg = """
VENV TROUBLESHOOT HELP
----------------------
Common cause: .venv\\Scripts\\pip.exe points to a Python that no longer exists (different user).
Recommended steps (Windows):

1) Delete the broken venv folder:
   - In PowerShell: Remove-Item -Recurse -Force .venv
   - Or: rmdir /S /Q .venv

2) Recreate venv using the Python you want (use full path if ambiguous):
   - Example using system python:
     C:\\Path\\To\\python.exe -m venv .venv

3) Activate the new venv:
   - PowerShell: .\\.venv\\Scripts\\Activate.ps1
   - cmd.exe: .venv\\Scripts\\activate.bat

4) Upgrade pip and install dependencies using the venv's python:
   - python -m pip install --upgrade pip
   - python -m pip install opencv-python numpy scikit-learn joblib

Alternative repair (if you prefer not to recreate):
   - Activate venv, then:
     python -m ensurepip --upgrade
     python -m pip install --upgrade pip

If you still see errors, run `where python` and use the full path to the python.exe you want when creating the venv.
"""
    print(msg)

# Optionally show the help if script invoked directly for troubleshooting
if __name__ == "__main__" and False:
    # flip to True to print quick help when running `python train.py` interactively
    venv_troubleshoot()

import os
import cv2
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
import joblib

data_dir = os.path.join("dataset", "PlantVillage")
categories = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
data, labels = [], []

print("Categories found:", categories)
print("Counting images per category...")

for i, category in enumerate(categories):
    folder_path = os.path.join(data_dir, category)
    image_count = 0
    for file in os.listdir(folder_path):
        img_path = os.path.join(folder_path, file)
        img = cv2.imread(img_path)
        if img is not None:
            img = cv2.resize(img, (64, 64))
            data.append(img.flatten())
            labels.append(i)
            image_count += 1
        else:
            print(f"⚠️ Could not read image: {img_path}")
    print(f"  {category}: {image_count} images")

if not data:
    print("❌ No images loaded. Please check your dataset folder and image files.")
    exit()

X = np.array(data)
y = np.array(labels)

print(f"Total images loaded: {len(X)}")
print("Splitting data and training model...")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y)

model = SVC(kernel='linear', probability=True)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print("✅ Model trained successfully!")
print("📊 Accuracy on test set:", accuracy)

os.makedirs("model", exist_ok=True)
joblib.dump((model, categories), "model/plant_model.pkl")
print("Model saved to model/plant_model.pkl")
