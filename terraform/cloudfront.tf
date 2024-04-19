variable "with_cloudfront" {
  type    = bool
  default = false
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "test_bucket" {
  bucket = "lambda-edge-test-${random_id.bucket_suffix.hex}"
  count  = var.with_cloudfront ? 1 : 0

  tags = {
    Name        = "My bucket"
    Environment = "Dev"
  }
}

resource "aws_cloudfront_distribution" "test_distribution" {
  count = var.with_cloudfront ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Some comment"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  # aliases             = ["mysite.example.com", "yoursite.example.com"]

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  origin {
    origin_id   = "s3-origin"
    domain_name = aws_s3_bucket.test_bucket[0].bucket_regional_domain_name
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "DELETE"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "s3-origin"

    viewer_protocol_policy   = "redirect-to-https"
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CacheDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
