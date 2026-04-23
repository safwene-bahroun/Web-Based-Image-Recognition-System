import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  userName = '';
  selectedFile: File | null = null;
  responseMessage = '';
  isDragging = false;
  responseType: 'success' | 'error' | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient) {}

  /* ---------- file‑selection helpers ---------- */

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processFile(input.files[0]);
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /* ---------- drag‑and‑drop handlers ---------- */

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
    if (event.dataTransfer?.files.length) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  /* ---------- form actions ---------- */

  onSubmit(): void {
    if (!this.selectedFile || !this.userName) return;

    const formData = new FormData();
    formData.append('name', this.userName);
    formData.append('image', this.selectedFile);

    this.http.post<{ message: string }>('http://localhost:5000/register_face', formData)
      .subscribe({
        next: (res) => {
          this.responseMessage = res.message;
          this.responseType = 'success';
          // Reset form on successful submission
          setTimeout(() => {
            this.onCancel();
            this.responseType = null;
          }, 3000);
        },
        error: (err) => {
          this.responseMessage = err.error?.message || 'Error uploading image. Please try again.';
          this.responseType = 'error';
        }
      });
  }

  onCancel(): void {
    this.userName = '';
    this.selectedFile = null;
    this.responseMessage = '';
    this.responseType = null;
    this.fileInput.nativeElement.value = '';
  }

  /* ---------- utilities ---------- */

  private processFile(file: File): void {
    if (!this.isImageFile(file)) {
      this.responseMessage = '⚠️ Only image files are allowed (JPEG, PNG, etc.)';
      this.responseType = 'error';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      this.responseMessage = '⚠️ Image size too large (max 5MB)';
      this.responseType = 'error';
      return;
    }

    this.selectedFile = file;
    this.responseMessage = ' Image selected: ' + file.name;
    this.responseType = 'success';
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }
}