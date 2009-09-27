
crx:
	ruby ./makecrx.rb
clean:
	find . -name .DS_Store | xargs rm
	-rm ./gae/capyoura/static/releases/capyoura.crx

.PHONY: crx clean