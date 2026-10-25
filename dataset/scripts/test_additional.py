import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from PIL import Image
import prepare_additional as prep


class ImportSafety(unittest.TestCase):
    def test_pixel_duplicates_across_encoding_metadata(self):
        image=Image.new('RGB',(12,12),'green')
        first,second=io.BytesIO(),io.BytesIO()
        image.save(first,format='PNG',compress_level=0)
        image.save(second,format='PNG',compress_level=9)
        self.assertNotEqual(first.getvalue(),second.getvalue())
        self.assertEqual(prep.pixel_hash(first.getvalue()),prep.pixel_hash(second.getvalue()))

    def test_official_plantwild_split_reserves_validation_and_test(self):
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr('plantwild/trainval.txt','apple leaf/a.jpg=0=1\napple leaf/b.jpg=0=2\napple leaf/c.jpg=0=0')
            for name in 'abc':z.writestr(f'plantwild/images/apple leaf/{name}.jpg',b'image')
        with zipfile.ZipFile(archive) as z:
            train,heldout,_=prep.split_members('PlantWild',z)
        self.assertEqual(train,{'apple leaf/a.jpg'})
        self.assertEqual(heldout,{'apple leaf/b.jpg','apple leaf/c.jpg'})

    def test_missing_or_overlapping_splits_are_rejected(self):
        for split in [None,'apple leaf/a.jpg=0=1\napple leaf/a.jpg=0=0']:
            archive=io.BytesIO()
            with zipfile.ZipFile(archive,'w') as z:
                z.writestr('plantwild/images/apple leaf/a.jpg',b'image')
                if split:z.writestr('plantwild/trainval.txt',split)
            with zipfile.ZipFile(archive) as z:
                with self.assertRaises(ValueError):prep.split_members('PlantWild',z)


if __name__=='__main__':unittest.main()
