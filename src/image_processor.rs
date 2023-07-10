

use std::io::Cursor;

use image::imageops::FilterType;
use image::io::Reader;
use log::error;
use serde::{Deserialize, Serialize};

/// Represents the orientation of an image in two dimensions
/// rotation:               0, 90, 180 or 270
/// mirror_vertically:      true, if the image is mirrored vertically
#[derive(Serialize, Deserialize, Debug, Copy, Clone, PartialEq, Eq)]
pub struct ImageOrientation {
    pub rotation: u16,
    pub mirror_vertically: bool,
}

/// Adjusts the image to fit optimal to the browser resolution
/// Also fixes the orientation delivered by the exif image rotation
/// src: <https://sirv.com/help/articles/rotate-photos-to-be-upright/>
pub fn adjust_image(
    resource_path: String,
    resource_data: Vec<u8>,
    display_width: u32,
    display_height: u32,
    image_orientation: Option<ImageOrientation>,
) -> Option<Vec<u8>> {
    let read_result = Reader::new(Cursor::new(&resource_data))
        .with_guessed_format()
        .unwrap()
        .decode();

    if read_result.is_err() {
        error!("{resource_path} | Error: {}", read_result.unwrap_err());
        return None;
    }

    // Resize the image to the needed display size
    let resized = read_result
        .unwrap()
        .resize(display_width, display_height, FilterType::Triangle);

    // Rotate or flip the image if needed
    let fixed_orientation = if let Some(orientation) = image_orientation {
        let rotated = match orientation.rotation {
            90 => resized.rotate90(),
            180 => resized.rotate180(),
            270 => resized.rotate270(),
            _ => resized,
        };

        if orientation.mirror_vertically {
            rotated.flipv()
        } else {
            rotated
        }
    } else {
        resized
    };

    // Write the image to a buffer
    let mut bytes: Vec<u8> = Vec::new();
    fixed_orientation
        .write_to(&mut Cursor::new(&mut bytes), image::ImageOutputFormat::Png)
        .unwrap();
    Some(bytes)
}
