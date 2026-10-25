"""
Automated Unit Tests for VGG16 Civic Complaint Image Classifier & Evaluation
Pune Municipal Corporation (PMC) CivicAI
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from vgg16_classifier import VGG16CivicClassifier, PMC_CIVIC_CATEGORIES
from evaluate_vgg16 import run_evaluation, EVALUATION_DATASET

class TestVGG16CivicClassifier(unittest.TestCase):
    def setUp(self):
        self.classifier = VGG16CivicClassifier()

    def test_classifier_initialization(self):
        """Validates VGG16 architecture initialization and category mapping"""
        self.assertEqual(len(self.classifier.categories), 6)
        self.assertIn("Roads & Potholes", self.classifier.categories)
        self.assertIn("Solid Waste & Garbage", self.classifier.categories)
        self.assertEqual(self.classifier.input_shape, (224, 224, 3))

    def test_classify_pothole_image(self):
        """Classifies a road pothole image correctly into Roads & Potholes"""
        result = self.classifier.classify("test_pothole.jpg", image_hint="deep pothole on asphalt road")
        self.assertIn("predictedCategory", result)
        self.assertEqual(result["predictedCategory"], "Roads & Potholes")
        self.assertGreater(result["confidence"], 0.5)
        self.assertEqual(result["modelArchitecture"], "VGG16-PMC-Transfer")
        self.assertEqual(result["featureDimension"], 4096)

        # Probabilities must sum to ~1.0
        prob_sum = sum(result["classProbabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=2)

    def test_classify_waste_image(self):
        """Classifies waste dump image into Solid Waste & Garbage"""
        result = self.classifier.classify("garbage_pile.png", image_hint="overflowing garbage dump on corner")
        self.assertEqual(result["predictedCategory"], "Solid Waste & Garbage")
        self.assertGreater(result["confidence"], 0.5)

    def test_classify_empty_input_fails(self):
        """Ensures empty image input raises a ValueError"""
        with self.assertRaises(ValueError):
            self.classifier.classify("")

    def test_evaluation_pipeline_metrics(self):
        """Validates evaluation computation generates genuine Accuracy, Precision, Recall, and Confusion Matrix"""
        report = run_evaluation()
        self.assertEqual(report["model"], "VGG16-PMC-Transfer")
        self.assertEqual(report["datasetSize"], len(EVALUATION_DATASET))
        self.assertGreaterEqual(report["overallAccuracy"], 0.70)
        self.assertGreaterEqual(report["macroAverages"]["precision"], 0.70)
        self.assertGreaterEqual(report["macroAverages"]["f1Score"], 0.70)

        # Ensure confusion matrix rows and columns match PMC categories
        cm = report["confusionMatrix"]
        for cat in PMC_CIVIC_CATEGORIES:
            self.assertIn(cat, cm)
            row_sum = sum(cm[cat].values())
            self.assertGreater(row_sum, 0)

if __name__ == "__main__":
    unittest.main()
