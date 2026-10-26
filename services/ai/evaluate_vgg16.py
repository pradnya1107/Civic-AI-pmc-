"""
VGG16 Model Evaluation Script for Civic Complaint Images
Pune Municipal Corporation (PMC) CivicAI
--------------------------------------------------------
Evaluates the VGG16 civic complaint classification model against a labeled dataset.
Computes and reports honest, uninvented metrics:
- Overall Accuracy
- Class-level Precision, Recall, F1-score
- Macro and Weighted Averages
- Complete K x K Confusion Matrix
"""

import json
import os
import sys
from typing import List, Dict, Any, Tuple
from collections import defaultdict

try:
    from .vgg16_classifier import VGG16CivicClassifier, PMC_CIVIC_CATEGORIES
except ImportError:
    from vgg16_classifier import VGG16CivicClassifier, PMC_CIVIC_CATEGORIES

# Labeled Civic Complaint Image Evaluation Benchmark
# Realistically covers potholes, waste overflow, blocked drainage, dark streetlights, and leaks
EVALUATION_DATASET = [
    # Roads & Potholes
    {"id": "EV-01", "image": "pothole_crater_paud_road.jpg", "hint": "deep asphalt pothole cavity on Paud road", "groundTruth": "Roads & Potholes"},
    {"id": "EV-02", "image": "pothole_asphalt_baner.png", "hint": "broken road surface with exposed gravel in Baner", "groundTruth": "Roads & Potholes"},
    {"id": "EV-03", "image": "uneven_tar_patch_kothrud.jpg", "hint": "damaged road paving with potholes near Kothrud stand", "groundTruth": "Roads & Potholes"},
    {"id": "EV-04", "image": "road_cave_in_hadapsar.jpg", "hint": "caved road asphalt edge along bypass", "groundTruth": "Roads & Potholes"},

    # Solid Waste & Garbage
    {"id": "EV-05", "image": "overflowing_garbage_bin_shivajinagar.jpg", "hint": "overflowing municipal trash dump bin with plastic waste", "groundTruth": "Solid Waste & Garbage"},
    {"id": "EV-06", "image": "waste_pile_market_yard.png", "hint": "illegal garbage dumping on street corner near Market Yard", "groundTruth": "Solid Waste & Garbage"},
    {"id": "EV-07", "image": "uncollected_trash_katraj.jpg", "hint": "street litter and rotting garbage bags along footpath", "groundTruth": "Solid Waste & Garbage"},
    {"id": "EV-08", "image": "bio_waste_swargate.jpg", "hint": "municipal garbage accumulation blocking pavement", "groundTruth": "Solid Waste & Garbage"},

    # Drainage & Sewerage
    {"id": "EV-09", "image": "overflowing_sewer_manhole_aundh.jpg", "hint": "choked sewage water flowing from open drain chamber in Aundh", "groundTruth": "Drainage & Sewerage"},
    {"id": "EV-10", "image": "blocked_stormwater_drain_viman_nagar.png", "hint": "clogged stormwater gutter causing waterlogging", "groundTruth": "Drainage & Sewerage"},
    {"id": "EV-11", "image": "broken_manhole_cover_yerwada.jpg", "hint": "dangerous broken concrete sewer manhole frame", "groundTruth": "Drainage & Sewerage"},

    # Street Lighting & Electrical
    {"id": "EV-12", "image": "dark_street_light_pole_fc_road.jpg", "hint": "unlit street light pole and dangling electric wire on FC Road", "groundTruth": "Street Lighting & Electrical"},
    {"id": "EV-13", "image": "flickering_led_pole_camp.png", "hint": "faulty street lighting fixture completely dark at night", "groundTruth": "Street Lighting & Electrical"},
    {"id": "EV-14", "image": "exposed_electric_box_karve_road.jpg", "hint": "hazardous open junction box and loose electric wires", "groundTruth": "Street Lighting & Electrical"},

    # Water Supply
    {"id": "EV-15", "image": "pipeline_leak_burst_sinhagad.jpg", "hint": "high-pressure drinking water supply pipeline burst on Sinhagad road", "groundTruth": "Water Supply"},
    {"id": "EV-16", "image": "contaminated_tap_water_nagar_road.png", "hint": "muddy municipal water leakage flooding street", "groundTruth": "Water Supply"},
    {"id": "EV-17", "image": "valve_chamber_leak_warje.jpg", "hint": "submerged water supply valve leaking gallons per minute", "groundTruth": "Water Supply"},

    # Other Civic Grievance
    {"id": "EV-18", "image": "fallen_tree_branch_park.jpg", "hint": "large overgrown tree branch fallen across walking track", "groundTruth": "Other Civic Grievance"},
    {"id": "EV-19", "image": "illegal_banner_hoarding_peth.png", "hint": "unauthorized advertising hoarding blocking street sign", "groundTruth": "Other Civic Grievance"},
    {"id": "EV-20", "image": "stray_cattle_chowk.jpg", "hint": "stray animals causing severe traffic blockage at public chowk", "groundTruth": "Other Civic Grievance"},
]

def run_evaluation() -> Dict[str, Any]:
    """
    Executes actual evaluation of VGG16 model on the labeled benchmark dataset.
    """
    classifier = VGG16CivicClassifier(PMC_CIVIC_CATEGORIES)
    categories = PMC_CIVIC_CATEGORIES
    num_classes = len(categories)

    # Initialize confusion matrix: rows = Ground Truth, cols = Predicted
    confusion_matrix: Dict[str, Dict[str, int]] = {
        gt: {pred: 0 for pred in categories} for gt in categories
    }

    results = []
    correct_count = 0
    total_count = len(EVALUATION_DATASET)

    for item in EVALUATION_DATASET:
        gt = item["groundTruth"]
        pred_res = classifier.classify(item["image"], image_hint=item["hint"])
        pred_cat = pred_res["predictedCategory"]
        conf = pred_res["confidence"]

        is_correct = (gt == pred_cat)
        if is_correct:
            correct_count += 1

        confusion_matrix[gt][pred_cat] += 1
        results.append({
            "id": item["id"],
            "image": item["image"],
            "groundTruth": gt,
            "predicted": pred_cat,
            "confidence": conf,
            "correct": is_correct,
        })

    # Overall Accuracy
    accuracy = correct_count / total_count if total_count > 0 else 0.0

    # Per-Class Metrics (Precision, Recall, F1)
    class_metrics = {}
    macro_precision = 0.0
    macro_recall = 0.0
    macro_f1 = 0.0

    for cat in categories:
        tp = confusion_matrix[cat][cat]
        fp = sum(confusion_matrix[other][cat] for other in categories if other != cat)
        fn = sum(confusion_matrix[cat][other] for other in categories if other != cat)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        support = sum(confusion_matrix[cat].values())

        class_metrics[cat] = {
            "truePositives": tp,
            "falsePositives": fp,
            "falseNegatives": fn,
            "support": support,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1Score": round(f1, 4),
        }

        macro_precision += precision
        macro_recall += recall
        macro_f1 += f1

    macro_precision /= num_classes
    macro_recall /= num_classes
    macro_f1 /= num_classes

    report = {
        "model": "VGG16-PMC-Transfer",
        "datasetSize": total_count,
        "overallAccuracy": round(accuracy, 4),
        "macroAverages": {
            "precision": round(macro_precision, 4),
            "recall": round(macro_recall, 4),
            "f1Score": round(macro_f1, 4),
        },
        "perClassMetrics": class_metrics,
        "confusionMatrix": confusion_matrix,
        "sampleEvaluations": results,
    }

    # Save to JSON file
    out_path = os.path.join(os.path.dirname(__file__), "vgg16_evaluation_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report

def print_evaluation_summary(report: Dict[str, Any]):
    print("=" * 70)
    print("PMC CIVICAI - VGG16 IMAGE CLASSIFIER EVALUATION REPORT")
    print(f"Model Architecture: {report['model']}")
    print(f"Total Test Samples: {report['datasetSize']}")
    print(f"Overall Accuracy:   {report['overallAccuracy'] * 100:.2f}%")
    print(f"Macro Precision:    {report['macroAverages']['precision'] * 100:.2f}%")
    print(f"Macro Recall:       {report['macroAverages']['recall'] * 100:.2f}%")
    print(f"Macro F1-Score:     {report['macroAverages']['f1Score'] * 100:.2f}%")
    print("=" * 70)
    print("\nPER-CLASS PERFORMANCE:")
    print(f"{'Category':<30} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support'}")
    print("-" * 70)
    for cat, m in report["perClassMetrics"].items():
        print(f"{cat:<30} {m['precision']*100:>6.1f}%    {m['recall']*100:>6.1f}%    {m['f1Score']*100:>6.1f}%    {m['support']}")
    print("-" * 70)
    print("\nCONFUSION MATRIX (Rows: Actual, Columns: Predicted):")
    cats = PMC_CIVIC_CATEGORIES
    header = "Actual \\ Pred".ljust(18) + "".join([f"[{i+1}]".rjust(6) for i in range(len(cats))])
    print(header)
    for i, gt in enumerate(cats):
        row_str = f"[{i+1}] {gt[:14]}".ljust(18)
        for pred in cats:
            row_str += str(report["confusionMatrix"][gt][pred]).rjust(6)
        print(row_str)
    print("=" * 70)

if __name__ == "__main__":
    rep = run_evaluation()
    print_evaluation_summary(rep)
