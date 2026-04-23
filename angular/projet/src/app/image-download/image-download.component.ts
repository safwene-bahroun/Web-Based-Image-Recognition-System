import { Component, ElementRef, ViewChild } from '@angular/core';
import { UploadService } from '../upload-image.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
@Component({
  selector: 'app-image-download',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-download.component.html',
  styleUrls: ['./image-download.component.css'],
})
export class ImageDownloadComponent {
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadResponse: string = '';
  uploadComplete = false;
  isDragging = false;
  isUploading = false;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isPredicting = false;
  isScanning = false;

  constructor(
    private uploadService: UploadService,
    private router: Router
  ) {}

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (this.isImageFile(file)) {
        this.processFile(file);
      } else {
        this.uploadResponse = 'Only image files are allowed';
      }
    }
  }

  private isImageFile(file: File): boolean {
    return file.type.match('image.*') !== null;
  }

  private processFile(file: File): void {
    this.selectedFile = file;
    this.uploadResponse = '';
    const reader = new FileReader();
    reader.readAsDataURL(this.selectedFile);
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
  }

  onSubmit(): void {
    if (!this.selectedFile) return;

    this.isPredicting = true;
    this.uploadResponse = '';

    this.uploadService.uploadImage(this.selectedFile).subscribe({
      next: (response) => {
        this.isPredicting = false;
        this.uploadResponse = 'Processing complete!';
        if (response.filename) {
          this.router.navigate(['/show_items', response.filename]);
        }
        if (response.detected_labels) {
          this.uploadService.setDetectedLabels(response.detected_labels);
        }
      },
      error: (err) => {
        this.isPredicting = false;
        this.uploadResponse = 'Prediction failed';
      }
    });
  }


 // New property for barcode results
 barcodeResults: { type: string, data: string }[] = [];
 showBarcodeResults = false;

// New method for barcode scanning
onScanBarcode(): void {
  if (!this.selectedFile) return;

  this.isScanning = true;
  this.uploadResponse = '';

  this.uploadService.readBarcode(this.selectedFile).subscribe({
    next: (response) => {
      this.isScanning = false;
      this.uploadResponse = 'Scanning complete!';
      if (response.filename) {
        this.uploadService.setFilename(response.filename);
        this.uploadService.setDecodedResults(response.results.barcodes || []); // 👈 add this
        this.router.navigate(['/barcode_results', response.filename], {
          queryParams: { mode: 'barcode' }
        });
      }
      this.onReset();
    },
    error: (error) => {
      this.isScanning = false;
      this.uploadResponse = 'Scanning failed';
    }
  });
}


  onReset(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.uploadResponse = '';
    this.isDragging = false;
    this.isPredicting = false;
    this.isScanning = false;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
