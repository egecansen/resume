# Use the official Jekyll image as the base image
FROM jekyll/jekyll:4.2.2

# Set the working directory inside the container
WORKDIR /srv/jekyll

# Switch to root user to install system dependencies and modify permissions
USER root

# Update the apk repositories to ensure the latest package versions are available
RUN apk update

# Install system dependencies for gem installation
RUN apk add --no-cache build-base libffi-dev libxml2-dev libxslt-dev \
    openssl-dev readline-dev zlib-dev

# Ensure the working directory has the correct permissions
RUN chown -R jekyll:jekyll /srv/jekyll

# Switch to the 'jekyll' user to avoid permission issues
USER jekyll

# Set GEM_HOME and GEM_PATH to install gems in a user-writable directory
ENV GEM_HOME=/srv/jekyll/.gem
ENV GEM_PATH=/srv/jekyll/.gem

# Create the .gem directory and set the correct ownership
RUN mkdir -p /srv/jekyll/.gem && chown -R jekyll:jekyll /srv/jekyll/.gem

# Ensure the directory for gem installations exists and has correct permissions
RUN mkdir -p /srv/jekyll/vendor/bundle && chown -R jekyll:jekyll /srv/jekyll/vendor

# Copy the Gemfile and Gemfile.lock into the container
COPY Gemfile Gemfile.lock /srv/jekyll/

# Switch back to root to change ownership of Gemfile and Gemfile.lock
USER root
RUN chown -R jekyll:jekyll /srv/jekyll/Gemfile /srv/jekyll/Gemfile.lock

# Switch back to jekyll user
USER jekyll

# Install bundler
RUN gem install bundler -v '2.6.5' --no-document

# Install the required gems using a specific path to avoid permission issues
RUN bundle install --path /srv/jekyll/vendor/bundle

# Ensure the directory and files have the correct permissions
RUN chown -R jekyll:jekyll /srv/jekyll

# Copy the entire project into the container and ensure proper ownership
COPY --chown=jekyll:jekyll . .

# Expose port 4000 for Jekyll
EXPOSE 4000

# Command to serve the Jekyll site
CMD ["bundle", "exec", "jekyll", "serve", "--watch", "--force_polling", "--host", "0.0.0.0"]
