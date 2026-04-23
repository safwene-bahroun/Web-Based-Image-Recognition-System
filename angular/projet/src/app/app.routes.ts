import { HomeComponent } from './home/home.component';
import { ImageDownloadComponent } from './image-download/image-download.component';
import{PredictImageComponent} from './predict-image/predict-image.component'
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FaceVerifyComponent} from './verify-face/verify-face.component';
export const routes: Routes = [
  { path: 'upload_image', component: ImageDownloadComponent },
  { path: 'show_items/:filename', component: PredictImageComponent },
  {path: 'barcode_results/:filename', component: PredictImageComponent },
  { path: 'home_page', component: HomeComponent },
  { path: 'verify_face', component:FaceVerifyComponent}
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }





